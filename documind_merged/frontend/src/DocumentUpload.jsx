import { useState, useRef } from 'react';
import { docsAPI } from './api';

export default function DocumentUpload({ onUploaded }) {
  const [files, setFiles]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const addFiles = (newFiles) => {
    const ok = ['pdf','docx','txt','md'];
    const filtered = Array.from(newFiles)
      .filter(f => ok.includes(f.name.split('.').pop().toLowerCase()))
      .slice(0, 2 - files.length);
    setFiles(prev => [...prev, ...filtered].slice(0, 2));
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };
  const removeFile = (i) => setFiles(prev => prev.filter((_,idx) => idx !== i));

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const r = await docsAPI.upload(fd);
      setResult(r.data);
      onUploaded && onUploaded(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); }
  };

  const strategyMeta = {
    identical: { color: '#22c55e', label: '🟢 Highly Similar', bg: '#f0fdf4', border: '#bbf7d0' },
    partial:   { color: '#f472b6', label: '🌸 Partially Related', bg: '#fdf2f8', border: '#fbcfe8' },
    different: { color: '#9c7fb5', label: '💜 Different Topics', bg: '#faf5ff', border: '#e9d5ff' },
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Drop Zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={handleDrop}
        onClick={()=>fileRef.current?.click()}
        style={{
          border:`2px dashed ${dragging?'#f472b6':'#fce7f3'}`, borderRadius:16,
          padding:'40px 24px', textAlign:'center', cursor:'pointer',
          background:dragging?'#fdf2f8':'#fef6fb', transition:'all 0.2s',
        }}
      >
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md"
          style={{display:'none'}} onChange={e=>addFiles(e.target.files)} />
        <div style={{fontSize:40,marginBottom:12}}>📂</div>
        <p style={{fontWeight:600,color:'#5c4a6e',marginBottom:6}}>Drop your documents here</p>
        <p style={{fontSize:13,color:'#9c7fb5'}}>PDF, DOCX, TXT, MD • Up to 2 files</p>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {files.map((f,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#f4fef7',border:'1px solid #dcfce7',borderRadius:10}}>
              <span style={{fontSize:22}}>{f.name.endsWith('.pdf')?'📄':f.name.endsWith('.docx')?'📝':'📃'}</span>
              <div style={{flex:1}}>
                <p style={{fontWeight:600,fontSize:14,color:'#2d1b2e'}}>{f.name}</p>
                <p style={{fontSize:12,color:'#9c7fb5'}}>{(f.size/1024).toFixed(1)} KB</p>
              </div>
              <button onClick={e=>{e.stopPropagation();removeFile(i)}}
                style={{background:'none',border:'none',cursor:'pointer',color:'#9c7fb5',fontSize:18}}>×</button>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',color:'#ef4444',fontSize:13}}>{error}</div>}

      <button className="btn-primary" onClick={handleUpload} disabled={!files.length||uploading} style={{width:'100%',padding:'14px'}}>
        {uploading ? (
          <span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}>
            <span className="loading-spinner"/>Processing + indexing into RAG...
          </span>
        ) : `Upload ${files.length} Document${files.length!==1?'s':''}`}
      </button>

      {/* Result */}
      {result && (
        <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Doc cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            {result.documents.map((d,i) => (
              <div key={i} style={{padding:'14px 16px',background:'#fdf2f8',border:'1px solid #fce7f3',borderRadius:12}}>
                <p style={{fontWeight:600,fontSize:13,color:'#2d1b2e',marginBottom:4}}>Doc {i+1}</p>
                <p style={{fontSize:12,color:'#9c7fb5',marginBottom:8,wordBreak:'break-all'}}>{d.filename}</p>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <p style={{fontSize:13,color:'#ec4899',fontWeight:600}}>{d.word_count.toLocaleString()} words</p>
                  {d.page_count && <p style={{fontSize:12,color:'#9c7fb5'}}>📄 {d.page_count} pages</p>}
                  {d.table_count > 0 && (
                    <p style={{fontSize:12,color:'#16a34a',fontWeight:500}}>
                      ✅ {d.table_count} table{d.table_count!==1?'s':''} extracted
                    </p>
                  )}
                  {d.image_count > 0 && (
                    <p style={{fontSize:12,color:d.vision_used?'#3b82f6':'#f59e0b',fontWeight:500}}>
                      {d.vision_used
                        ? `👁️ ${d.images_described}/${d.image_count} image${d.image_count!==1?'s':''} described by AI`
                        : `🖼️ ${d.image_count} image${d.image_count!==1?'s':''} found (llava not active)`
                      }
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* llava status banner */}
          {result.documents.some(d => d.image_count > 0) && (
            <div style={{
              padding:'12px 16px',
              background: result.llava_used ? '#eff6ff' : '#fffbeb',
              border:`1px solid ${result.llava_used ? '#bfdbfe' : '#fde68a'}`,
              borderRadius:10, fontSize:13,
              color: result.llava_used ? '#1d4ed8' : '#92400e',
            }}>
              {result.llava_used ? (
                <span>👁️ <strong>Vision AI active</strong> — images, tables and diagrams described by llava and added to RAG. Quiz and chat can now reference visual content.</span>
              ) : (
                <span>⚠️ <strong>Images found but llava is not running.</strong> Tables and drawings inside images are invisible to the AI. Fix: run <code style={{background:'rgba(0,0,0,0.07)',padding:'1px 6px',borderRadius:4}}>ollama pull llava</code> then re-upload.</span>
              )}
            </div>
          )}

          {/* RAG index badge */}
          {result.rag && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10}}>
              <span style={{fontSize:18}}>🧠</span>
              <div>
                <p style={{fontWeight:700,fontSize:13,color:'#16a34a'}}>RAG Pipeline Ready</p>
                <p style={{fontSize:12,color:'#5c4a6e'}}>
                  {result.rag.chunks_indexed} chunks indexed • ChromaDB + TF-IDF embeddings
                </p>
              </div>
            </div>
          )}

          {/* Comparison */}
          {result.comparison && (() => {
            const c = result.comparison;
            const m = strategyMeta[c.strategy] || strategyMeta.different;
            return (
              <div style={{padding:'16px 20px',background:m.bg,border:`1px solid ${m.border}`,borderRadius:14}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <span style={{fontWeight:700,color:m.color,fontSize:15}}>{m.label}</span>
                  <span style={{fontSize:13,color:'#9c7fb5',fontWeight:600}}>{c.similarity}% semantic similarity</span>
                </div>

                {/* Change stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                  {[
                    {label:'Unchanged', val:c.unchanged_sections, color:'#22c55e'},
                    {label:'Modified',  val:c.modified_sections,  color:'#f59e0b'},
                    {label:'Added',     val:c.added_sections,     color:'#3b82f6'},
                    {label:'Removed',   val:c.removed_sections,   color:'#ef4444'},
                  ].map(s => (
                    <div key={s.label} style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,0.7)',borderRadius:8}}>
                      <p style={{fontSize:18,fontWeight:700,color:s.color}}>{s.val}</p>
                      <p style={{fontSize:11,color:'#9c7fb5'}}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Chunk info */}
                <p style={{fontSize:12,color:'#9c7fb5',marginBottom:10}}>
                  Doc 1: {c.doc1_chunks} chunks &nbsp;•&nbsp; Doc 2: {c.doc2_chunks} chunks
                </p>

                {/* Common topics */}
                {c.common_topics?.length > 0 && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {c.common_topics.slice(0,10).map(t => (
                      <span key={t} style={{background:'rgba(255,255,255,0.8)',color:'#5c4a6e',borderRadius:999,padding:'3px 10px',fontSize:12,fontWeight:500,border:'1px solid rgba(0,0,0,0.06)'}}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Section previews */}
                {c.added_previews?.length > 0 && (
                  <div style={{marginTop:12}}>
                    <p style={{fontSize:12,fontWeight:700,color:'#3b82f6',marginBottom:6}}>➕ New sections in Doc 2:</p>
                    {c.added_previews.map((p,i) => (
                      <p key={i} style={{fontSize:12,color:'#5c4a6e',background:'rgba(59,130,246,0.06)',borderRadius:6,padding:'6px 10px',marginBottom:4}}>{p}</p>
                    ))}
                  </div>
                )}
                {c.removed_previews?.length > 0 && (
                  <div style={{marginTop:8}}>
                    <p style={{fontSize:12,fontWeight:700,color:'#ef4444',marginBottom:6}}>➖ Sections only in Doc 1:</p>
                    {c.removed_previews.map((p,i) => (
                      <p key={i} style={{fontSize:12,color:'#5c4a6e',background:'rgba(239,68,68,0.06)',borderRadius:6,padding:'6px 10px',marginBottom:4}}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{padding:'12px 16px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,fontSize:13,color:'#16a34a',fontWeight:500,textAlign:'center'}}>
            ✅ Documents indexed! Quiz, Flashcards & Summary will use RAG retrieval.
          </div>
        </div>
      )}
    </div>
  );
}
