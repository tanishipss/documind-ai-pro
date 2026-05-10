import { useState } from 'react';
import { aiAPI } from './api';

export default function SemanticSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const r = await aiAPI.hybridSearch(query, 5);
      setResults(r.data.results || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Search failed');
    } finally { setLoading(false); }
  };

  const scoreColor = (s) => s > 0.6 ? '#22c55e' : s > 0.3 ? '#f472b6' : '#9c7fb5';
  const scoreLabel = (s) => s > 0.6 ? 'High' : s > 0.3 ? 'Mid' : 'Low';

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      <div style={{padding:'14px 18px',background:'#fdf2f8',border:'1px solid #fce7f3',borderRadius:12}}>
        <h3 style={{fontFamily:'DM Sans,sans-serif',fontSize:15,fontWeight:600,color:'#ec4899',marginBottom:6}}>
          🔍 RAG Semantic Search
        </h3>
        <p style={{fontSize:13,color:'#9c7fb5'}}>
          Ask anything about your documents — the RAG pipeline retrieves the most relevant passages using TF-IDF vector similarity.
        </p>
      </div>

      <div style={{display:'flex',gap:10}}>
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>e.key==='Enter' && search()}
          placeholder="e.g. What are the main findings about neural networks?"
          style={{flex:1}}
        />
        <button className="btn-primary" onClick={search} disabled={!query.trim()||loading}
          style={{padding:'12px 20px',whiteSpace:'nowrap'}}>
          {loading ? <span className="loading-spinner"/> : 'Search'}
        </button>
      </div>

      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',color:'#ef4444',fontSize:13}}>{error}</div>}

      {results !== null && (
        <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:12}}>
          <p style={{fontSize:13,color:'#9c7fb5',fontWeight:500}}>
            {results.length} passage{results.length!==1?'s':''} retrieved for "{query}"
          </p>

          {results.length === 0 && (
            <div style={{textAlign:'center',padding:'32px',background:'#fdf2f8',borderRadius:14,border:'1px dashed #fbcfe8'}}>
              <p style={{color:'#9c7fb5'}}>No relevant passages found. Try a different query.</p>
            </div>
          )}

          {results.map((r, i) => (
            <div key={i} style={{background:'white',border:'1px solid #fce7f3',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)',borderBottom:'1px solid #fce7f3'}}>
                <span style={{fontWeight:700,fontSize:13,color:'#5c4a6e'}}>📄 {r.filename}</span>
                <span style={{fontSize:11,color:'#9c7fb5'}}>chunk #{r.chunk_index + 1}</span>
                <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:40,height:5,background:'#fce7f3',borderRadius:999,overflow:'hidden'}}>
                    <div style={{width:`${r.score*100}%`,height:'100%',background:`linear-gradient(90deg,#f472b6,#22c55e)`,borderRadius:999}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:scoreColor(r.score)}}>
                    {scoreLabel(r.score)} ({(r.score*100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div style={{padding:'14px 16px'}}>
                <p style={{fontSize:14,color:'#2d1b2e',lineHeight:1.7}}>{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Example queries */}
      {results === null && !loading && (
        <div>
          <p style={{fontSize:12,color:'#9c7fb5',marginBottom:10,fontWeight:600}}>Try example queries:</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {[
              'What is the main topic?',
              'Key findings and results',
              'Methods and approach',
              'Conclusions and recommendations',
              'Important definitions',
            ].map(q => (
              <button key={q} onClick={()=>{setQuery(q);}}
                style={{padding:'7px 14px',borderRadius:999,border:'1px solid #fce7f3',background:'white',cursor:'pointer',fontSize:12,color:'#9c7fb5',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s'}}
                onMouseOver={e=>{e.target.style.borderColor='#f472b6';e.target.style.color='#ec4899'}}
                onMouseOut={e=>{e.target.style.borderColor='#fce7f3';e.target.style.color='#9c7fb5'}}
              >{q}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
