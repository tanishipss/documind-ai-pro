import { useState } from 'react';
import { aiAPI } from './api';

export default function DocCompare() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await aiAPI.compareDocuments();
      setResult(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Comparison failed. Make sure you have 2 documents uploaded.');
    } finally { setLoading(false); }
  };

  const strategyInfo = {
    identical:  { icon:'🟢', label:'Highly Similar',   color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
    partial:    { icon:'🟡', label:'Partially Changed', color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
    different:  { icon:'🔴', label:'Significantly Different', color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Intro card */}
      <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', border:'1px solid #fce7f3', borderRadius:14 }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:'#2d1b2e', marginBottom:8 }}>
          🔬 Semantic Document Comparison
        </h3>
        <p style={{ fontSize:13, color:'#9c7fb5', lineHeight:1.6 }}>
          Upload two versions of a document (old + new) in the <strong style={{color:'#ec4899'}}>Documents</strong> tab,
          then run the comparison to see exactly what changed — added, modified, and removed sections.
        </p>
      </div>

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', color:'#ef4444', fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Run button */}
      <button
        className="btn-primary"
        onClick={run}
        disabled={loading}
        style={{ padding:'14px', fontSize:15 }}
      >
        {loading ? '🔍 Comparing documents…' : '🔍 Compare Documents'}
      </button>

      {loading && (
        <div style={{ textAlign:'center', padding:'32px' }}>
          <div className="loading-spinner" style={{ width:36, height:36, borderWidth:3, margin:'0 auto 16px' }} />
          <p style={{ color:'#9c7fb5', fontSize:14 }}>Running semantic analysis across all chunks…</p>
          <p style={{ color:'#c4b5d0', fontSize:12, marginTop:4 }}>This may take 10–20 seconds</p>
        </div>
      )}

      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="animate-fade">

          {/* Doc names */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { label:'📄 Document 1 (Old)', name: result.doc1_name, color:'#9333ea', bg:'#faf5ff', border:'#e9d5ff' },
              { label:'📄 Document 2 (New)', name: result.doc2_name, color:'#ec4899', bg:'#fdf2f8', border:'#fbcfe8' },
            ].map((d, i) => (
              <div key={i} style={{ padding:'12px 14px', background:d.bg, border:`1px solid ${d.border}`, borderRadius:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:d.color, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>{d.label}</p>
                <p style={{ fontSize:13, fontWeight:600, color:'#2d1b2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</p>
              </div>
            ))}
          </div>

          {/* Overall similarity */}
          {(() => {
            const s = strategyInfo[result.strategy] || strategyInfo.partial;
            return (
              <div style={{ padding:'20px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>{s.icon}</div>
                <h3 style={{ fontSize:22, fontWeight:700, color:s.color, marginBottom:4 }}>{result.similarity}% Similar</h3>
                <p style={{ fontSize:14, color:s.color, fontWeight:600 }}>{s.label}</p>
              </div>
            );
          })()}

          {/* Change stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { label:'Unchanged',  value: result.unchanged_sections, icon:'✅', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
              { label:'Modified',   value: result.modified_sections,  icon:'✏️', color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
              { label:'Added',      value: result.added_sections,     icon:'➕', color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
              { label:'Removed',    value: result.removed_sections,   icon:'🗑️', color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
            ].map(s => (
              <div key={s.label} style={{ padding:'16px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <p style={{ fontSize:26, fontWeight:700, color:s.color, marginBottom:2 }}>{s.value}</p>
                <p style={{ fontSize:12, color:'#9c7fb5' }}>{s.label} sections</p>
              </div>
            ))}
          </div>

          {/* Chunk counts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ padding:'12px 14px', background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:10, textAlign:'center' }}>
              <p style={{ fontSize:18, fontWeight:700, color:'#9333ea' }}>{result.doc1_chunks}</p>
              <p style={{ fontSize:11, color:'#9c7fb5' }}>Chunks in Doc 1</p>
            </div>
            <div style={{ padding:'12px 14px', background:'#fdf2f8', border:'1px solid #fbcfe8', borderRadius:10, textAlign:'center' }}>
              <p style={{ fontSize:18, fontWeight:700, color:'#ec4899' }}>{result.doc2_chunks}</p>
              <p style={{ fontSize:11, color:'#9c7fb5' }}>Chunks in Doc 2</p>
            </div>
          </div>

          {/* Visual diff bar */}
          {(() => {
            const total = result.unchanged_sections + result.modified_sections + result.added_sections + result.removed_sections;
            if (!total) return null;
            const pcts = {
              unchanged: Math.round((result.unchanged_sections / total) * 100),
              modified:  Math.round((result.modified_sections  / total) * 100),
              added:     Math.round((result.added_sections     / total) * 100),
              removed:   Math.round((result.removed_sections   / total) * 100),
            };
            return (
              <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:14, padding:'18px' }}>
                <p style={{ fontWeight:700, fontSize:13, color:'#5c4a6e', marginBottom:12 }}>📊 Change Distribution</p>
                <div style={{ display:'flex', height:16, borderRadius:999, overflow:'hidden', gap:2 }}>
                  {pcts.unchanged > 0 && <div style={{ width:`${pcts.unchanged}%`, background:'#22c55e', borderRadius:'999px 0 0 999px' }} title={`Unchanged: ${pcts.unchanged}%`} />}
                  {pcts.modified  > 0 && <div style={{ width:`${pcts.modified}%`,  background:'#f59e0b' }} title={`Modified: ${pcts.modified}%`} />}
                  {pcts.added     > 0 && <div style={{ width:`${pcts.added}%`,     background:'#3b82f6' }} title={`Added: ${pcts.added}%`} />}
                  {pcts.removed   > 0 && <div style={{ width:`${pcts.removed}%`,   background:'#ef4444', borderRadius:'0 999px 999px 0' }} title={`Removed: ${pcts.removed}%`} />}
                </div>
                <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                  {[
                    { color:'#22c55e', label:`Unchanged ${pcts.unchanged}%` },
                    { color:'#f59e0b', label:`Modified ${pcts.modified}%` },
                    { color:'#3b82f6', label:`Added ${pcts.added}%` },
                    { color:'#ef4444', label:`Removed ${pcts.removed}%` },
                  ].map(l => (
                    <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:l.color, flexShrink:0 }} />
                      <span style={{ fontSize:11, color:'#9c7fb5' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Common topics */}
          {result.common_topics?.length > 0 && (
            <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:14, padding:'16px 18px' }}>
              <p style={{ fontWeight:700, fontSize:13, color:'#5c4a6e', marginBottom:10 }}>🔗 Shared Topics</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {result.common_topics.map(t => (
                  <span key={t} style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:500 }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Added previews */}
          {result.added_previews?.length > 0 && (
            <SectionPreviews title="➕ Added Sections (new in Doc 2)" previews={result.added_previews} color="#3b82f6" bg="#eff6ff" border="#bfdbfe" />
          )}

          {/* Modified previews */}
          {result.modified_previews?.length > 0 && (
            <SectionPreviews title="✏️ Modified Sections" previews={result.modified_previews} color="#d97706" bg="#fffbeb" border="#fde68a" />
          )}

          {/* Removed previews */}
          {result.removed_previews?.length > 0 && (
            <SectionPreviews title="🗑️ Removed Sections (only in Doc 1)" previews={result.removed_previews} color="#ef4444" bg="#fef2f2" border="#fecaca" />
          )}

          {/* Regen hint */}
          {(result.added_sections > 0 || result.modified_sections > 0) && (
            <div style={{ padding:'14px 16px', background:'#fdf2f8', border:'1px dashed #f9a8d4', borderRadius:12, fontSize:13, color:'#9c7fb5' }}>
              💡 <strong style={{ color:'#ec4899' }}>Tip:</strong> Go to the <strong style={{ color:'#ec4899' }}>Quiz</strong> tab and use <em>"Updated Sections Only"</em> to generate questions focused on what changed in Doc 2.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionPreviews({ title, previews, color, bg, border }) {
  return (
    <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', background:bg, borderBottom:`1px solid ${border}` }}>
        <p style={{ fontWeight:700, fontSize:13, color }}>{title}</p>
      </div>
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {previews.map((p, i) => (
          <div key={i} style={{ padding:'10px 12px', background:bg, border:`1px solid ${border}`, borderRadius:8, fontSize:12, color:'#5c4a6e', lineHeight:1.6 }}>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
