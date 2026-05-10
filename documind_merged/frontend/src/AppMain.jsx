import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { aiAPI, docsAPI } from './api';
import DocumentUpload from './DocumentUpload';
import Quiz           from './Quiz';
import Summary        from './Summary';
import Flashcards     from './Flashcards';
import Dashboard      from './Dashboard';
import SemanticSearch from './SemanticSearch';
import Chat           from './Chat';
import DocCompare     from './DocCompare';

const tabs = [
  { id:'upload',  label:'Documents',  icon:'📂' },
  { id:'chat',    label:'Chat',       icon:'💬' },
  { id:'search',  label:'RAG Search', icon:'🔍' },
  { id:'quiz',    label:'Quiz',       icon:'🧠' },
  { id:'compare', label:'Doc Compare',icon:'🔬' },
  { id:'summary', label:'Summary',    icon:'✨' },
  { id:'flash',   label:'Flashcards', icon:'🃏' },
  { id:'dash',    label:'Progress',   icon:'📊' },
];

const subtitles = {
  upload:  'Upload PDF, DOCX, TXT, MD — auto-chunked and indexed into ChromaDB',
  chat:    'Conversational Q&A grounded in your document via RAG + memory',
  search:  'Hybrid vector + keyword search over your document chunks',
  quiz:    'RAG-grounded quiz with difficulty levels + version-aware regeneration',
  compare: 'Semantic chunk-level diff between two document versions — added, modified, removed',
  summary: 'Streaming AI summary from semantically retrieved document context',
  flash:   'Flashcards generated from RAG-retrieved key concepts',
  dash:    'Accuracy trends · weak areas · personalized guidance · full history',
};

export default function AppMain() {
  const [tab,        setTab]        = useState('upload');
  const [hasDoc,     setHasDoc]     = useState(false);
  const [ragReady,   setRagReady]   = useState(false);
  const [ragChunks,  setRagChunks]  = useState(0);
  const [ollamaOk,   setOllamaOk]   = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    aiAPI.ollamaStatus().then(r => setOllamaOk(r.data.running)).catch(() => setOllamaOk(false));
    docsAPI.ragStatus().then(r => {
      setRagReady(r.data.indexed);
      setRagChunks(r.data.chunks);
      setHasDoc(r.data.indexed);
    }).catch(() => {});
  }, []);

  const handleUploaded = (data) => {
    setHasDoc(true);
    setRagReady(data?.rag?.chunks_indexed > 0);
    setRagChunks(data?.rag?.chunks_indexed || 0);
  };

  const handleLogout = () => { logout(); navigate('/'); };
  const needsDoc = ['chat','search','quiz','summary','flash','compare'].includes(tab);

  return (
    <div style={{ display:'flex', height:'100vh', background:'#fdf2f8', overflow:'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside style={{ width:240, background:'white', borderRight:'1px solid #fce7f3', display:'flex', flexDirection:'column', flexShrink:0, boxShadow:'2px 0 16px rgba(236,72,153,0.06)' }}>

        {/* Logo */}
        <div style={{ padding:'20px 20px 14px', borderBottom:'1px solid #fce7f3' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:26 }}>📚</span>
            <div>
              <h1 style={{ fontSize:17, color:'#2d1b2e', lineHeight:1 }}>DocuMind AI</h1>
              <p style={{ fontSize:10, color:'#9c7fb5' }}>RAG · Learn · Adapt</p>
            </div>
          </div>
        </div>

        {/* Status pills */}
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ padding:'6px 12px', borderRadius:8, background:ollamaOk?'#f0fdf4':'#fef2f2', border:`1px solid ${ollamaOk?'#bbf7d0':'#fecaca'}`, fontSize:11, color:ollamaOk?'#16a34a':'#ef4444', fontWeight:600 }}>
            {ollamaOk===null?'⏳ Checking Ollama…':ollamaOk?'🟢 Ollama connected':'🔴 Ollama offline'}
          </div>
          <div style={{ padding:'6px 12px', borderRadius:8, background:ragReady?'#f0fdf4':'#fefce8', border:`1px solid ${ragReady?'#bbf7d0':'#fde68a'}`, fontSize:11, color:ragReady?'#16a34a':'#92400e', fontWeight:600 }}>
            {ragReady ? `🧠 RAG ready · ${ragChunks} chunks` : '⚠️ Upload a document first'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'4px 10px', overflowY:'auto' }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                borderRadius:10, border:'none', cursor:'pointer', marginBottom:2,
                background:active?'linear-gradient(135deg,#fdf2f8,#fce7f3)':'transparent',
                borderLeft:`3px solid ${active?'#ec4899':'transparent'}`,
                transition:'all 0.15s', textAlign:'left',
              }}>
                <span style={{ fontSize:16 }}>{t.icon}</span>
                <span style={{ fontSize:13, fontWeight:active?700:500, color:active?'#ec4899':'#5c4a6e', fontFamily:'DM Sans,sans-serif' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid #fce7f3' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#f472b6,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 }}>
              {user?.name?.[0]?.toUpperCase()||'U'}
            </div>
            <div style={{ overflow:'hidden' }}>
              <p style={{ fontWeight:600, fontSize:12, color:'#2d1b2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize:10, color:'#9c7fb5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width:'100%', padding:'7px', borderRadius:8, border:'1px solid #fce7f3', background:'white', cursor:'pointer', fontSize:12, color:'#9c7fb5', fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }}
            onMouseOver={e=>e.target.style.color='#ec4899'} onMouseOut={e=>e.target.style.color='#9c7fb5'}
          >Sign out</button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 28px 14px', borderBottom:'1px solid #fce7f3', background:'white', flexShrink:0 }}>
          <h2 style={{ fontSize:20, color:'#2d1b2e', marginBottom:2 }}>
            {tabs.find(t=>t.id===tab)?.icon} {tabs.find(t=>t.id===tab)?.label}
          </h2>
          <p style={{ fontSize:12, color:'#9c7fb5' }}>{subtitles[tab]}</p>
        </div>

        {/* Content */}
        <div style={{ flex:1, padding:'22px 28px', overflow:'auto' }}>
          <div style={{ maxWidth:720, margin:'0 auto' }}>
            {/* No-doc warning */}
            {needsDoc && !hasDoc && (
              <div style={{ padding:'12px 18px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, marginBottom:20, fontSize:13, color:'#92400e' }}>
                ⚠️ Please{' '}
                <button onClick={()=>setTab('upload')} style={{ background:'none', border:'none', cursor:'pointer', color:'#d97706', fontWeight:700, textDecoration:'underline', padding:0, font:'inherit' }}>
                  upload a document
                </button>{' '}
                first. The RAG pipeline must index it before generating content.
              </div>
            )}

            {tab==='upload'  && <DocumentUpload onUploaded={handleUploaded} />}
            {tab==='chat'    && <Chat />}
            {tab==='search'  && <SemanticSearch />}
            {tab==='quiz'    && <Quiz />}
            {tab==='compare' && <DocCompare />}
            {tab==='summary' && <Summary />}
            {tab==='flash'   && <Flashcards />}
            {tab==='dash'    && <Dashboard />}
          </div>
        </div>
      </main>
    </div>
  );
}
