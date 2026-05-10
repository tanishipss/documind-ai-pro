import { useState } from 'react';
import { aiAPI } from './api';

export default function Summary() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setSummary('');
    setDone(false);
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(aiAPI.getSummaryStream(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              setDone(true);
              setLoading(false);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                setLoading(false);
                return;
              }
              if (parsed.token) {
                setSummary(prev => prev + parsed.token);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      setError(e.message || 'Streaming failed');
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown renderer
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('## ') || line.startsWith('# ')) {
        elements.push(<h3 key={key++} style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#2d1b2e', margin: '16px 0 8px' }}>{line.replace(/^#+\s/, '')}</h3>);
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(<p key={key++} style={{ fontWeight: 700, color: '#5c4a6e', marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</p>);
      } else if (line.startsWith('- ') || line.startsWith('• ')) {
        elements.push(
          <div key={key++} style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 8 }}>
            <span style={{ color: '#f472b6', fontWeight: 700, marginTop: 1 }}>•</span>
            <p style={{ color: '#5c4a6e', fontSize: 14, lineHeight: 1.6 }}>{line.replace(/^[-•]\s/, '')}</p>
          </div>
        );
      } else if (line.trim()) {
        elements.push(<p key={key++} style={{ color: '#5c4a6e', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>{line}</p>);
      }
    }
    return elements;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '16px 20px', background: '#fdf2f8', border: '1px solid #fce7f3', borderRadius: 12 }}>
        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#5c4a6e', marginBottom: 6 }}>✨ AI Document Summary</h3>
        <p style={{ fontSize: 13, color: '#9c7fb5' }}>Get a comprehensive, streaming summary of your uploaded document(s) with key points and takeaways.</p>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {!summary && !loading && (
        <button className="btn-primary" onClick={generate} style={{ padding: '14px', fontSize: 16 }}>
          Generate Summary ✨
        </button>
      )}

      {(summary || loading) && (
        <div className="animate-fade" style={{ background: 'white', border: '1px solid #fce7f3', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #fdf2f8, #f0fdf4)', borderBottom: '1px solid #fce7f3', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#5c4a6e' }}>Summary</span>
            {loading && <span className="loading-spinner" style={{ marginLeft: 'auto' }} />}
            {done && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✓ Complete</span>}
          </div>
          <div style={{ padding: '20px', maxHeight: 480, overflowY: 'auto' }}>
            {renderMarkdown(summary)}
            {loading && (
              <span style={{ display: 'inline-block', width: 10, height: 16, background: '#f472b6', borderRadius: 2, animation: 'pulse 1s infinite', marginLeft: 2 }} />
            )}
          </div>
        </div>
      )}

      {done && (
        <button className="btn-ghost" onClick={generate}>Regenerate</button>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
