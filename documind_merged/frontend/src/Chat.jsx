import { useState, useRef, useEffect } from 'react';
import { aiAPI } from './api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const bottomRef = useRef(null);

  // Load persisted chat history on mount
  useEffect(() => {
    aiAPI.getChatHistory()
      .then(r => {
        const saved = r.data.messages || [];
        if (saved.length > 0) {
          setMessages(saved.map(m => ({ role: m.role, content: m.content, saved: true })));
        } else {
          setMessages([{ role:'assistant', content:'Hi! Ask me anything about your uploaded document. Every answer is grounded in your document via RAG.' }]);
        }
      })
      .catch(() => {
        setMessages([{ role:'assistant', content:'Hi! Ask me anything about your uploaded document.' }]);
      })
      .finally(() => setHistLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');

    const history = messages
      .filter(m => !m.streaming)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role:'user', content:msg }, { role:'assistant', content:'', streaming:true }]);
    setLoading(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(aiAPI.getChatStream(), {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setMessages(prev => { const u=[...prev]; u[u.length-1]={ role:'assistant', content:`Error: ${e.detail||'Failed'}` }; return u; });
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const p = JSON.parse(data);
            if (p.error) { setMessages(prev => { const u=[...prev]; u[u.length-1]={ role:'assistant', content:`Error: ${p.error}` }; return u; }); return; }
            if (p.token) { setMessages(prev => { const u=[...prev]; u[u.length-1]={ ...u[u.length-1], content: u[u.length-1].content+p.token }; return u; }); }
          } catch {}
        }
      }
      setMessages(prev => { const u=[...prev]; u[u.length-1]={ ...u[u.length-1], streaming:false }; return u; });
    } catch (e) {
      setMessages(prev => { const u=[...prev]; u[u.length-1]={ role:'assistant', content:`Connection error: ${e.message}` }; return u; });
    } finally { setLoading(false); }
  };

  const clearHistory = async () => {
    await aiAPI.clearChatHistory().catch(() => {});
    setMessages([{ role:'assistant', content:'Chat history cleared. Ask me anything about your document!' }]);
  };

  if (histLoading) return (
    <div style={{ textAlign:'center', padding:40 }}><span className="loading-spinner" /></div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header */}
      <div style={{ padding:'12px 18px', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', border:'1px solid #fce7f3', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ fontWeight:700, fontSize:14, color:'#ec4899', marginBottom:2 }}>💬 Document Q&A</p>
          <p style={{ fontSize:12, color:'#9c7fb5' }}>Conversational AI · RAG-grounded · Chat history saved to DB</p>
        </div>
        <button onClick={clearHistory} style={{ background:'none', border:'1px solid #fce7f3', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'#9c7fb5', fontFamily:'DM Sans,sans-serif' }}>
          🗑 Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:10, minHeight:300, maxHeight:460, padding:'4px 0' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
            <div style={{
              maxWidth:'82%', padding:'12px 16px',
              borderRadius: m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',
              background: m.role==='user'?'linear-gradient(135deg,#f472b6,#ec4899)':'white',
              color: m.role==='user'?'white':'#2d1b2e',
              border: m.role==='assistant'?'1px solid #fce7f3':'none',
              boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
              fontSize:14, lineHeight:1.6,
            }}>
              {m.content || (m.streaming && (
                <span style={{ display:'inline-flex', gap:4 }}>
                  {[0,1,2].map(j => (
                    <span key={j} style={{ width:6, height:6, borderRadius:'50%', background:'#f9a8d4', animation:'bounce 1s infinite', animationDelay:`${j*0.15}s` }}/>
                  ))}
                </span>
              ))}
              {m.saved && <span style={{ display:'block', fontSize:10, color:m.role==='user'?'rgba(255,255,255,0.6)':'#c4b5d0', marginTop:4 }}>saved</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your document..."
          disabled={loading}
          style={{ flex:1 }}
        />
        <button className="btn-primary" onClick={send} disabled={!input.trim()||loading} style={{ padding:'12px 20px', whiteSpace:'nowrap' }}>
          {loading ? <span className="loading-spinner"/> : 'Send'}
        </button>
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {['What is this document about?','What are the key findings?','Summarize the main points','List the important terms','What conclusions are drawn?'].map(q => (
            <button key={q} onClick={() => setInput(q)}
              style={{ padding:'6px 12px', borderRadius:999, border:'1px solid #fce7f3', background:'white', cursor:'pointer', fontSize:12, color:'#9c7fb5', fontFamily:'DM Sans,sans-serif' }}
              onMouseOver={e=>{e.target.style.color='#ec4899';e.target.style.borderColor='#f472b6'}}
              onMouseOut={e=>{e.target.style.color='#9c7fb5';e.target.style.borderColor='#fce7f3'}}
            >{q}</button>
          ))}
        </div>
      )}

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}
