import { useState, useEffect } from 'react';
import { authAPI } from './api';

export default function QuizHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    authAPI.quizHistory()
      .then(r => setHistory(r.data.history || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const difficulties = ['all', 'easy', 'medium', 'hard'];
  const filtered = filter === 'all' ? history : history.filter(h => h.difficulty === filter);

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b) => a + b, 0) / arr.length) : 0;
  const avgAcc = avg(history.map(h => h.accuracy));
  const best   = history.length ? Math.max(...history.map(h => h.accuracy)) : 0;
  const total  = history.length;

  if (loading) return (
    <div style={{textAlign:'center',padding:40}}>
      <span className="loading-spinner" style={{width:32,height:32,borderWidth:3}}/>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {label:'Total Quizzes', value:total,        icon:'📝', color:'#ec4899'},
          {label:'Average Score', value:`${avgAcc}%`, icon:'🎯', color:'#22c55e'},
          {label:'Best Score',    value:`${Math.round(best)}%`, icon:'🏆', color:'#f59e0b'},
        ].map(s => (
          <div key={s.label} style={{padding:'14px',background:'white',border:'1px solid #fce7f3',borderRadius:14,textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
            <p style={{fontSize:20,fontWeight:700,color:s.color}}>{s.value}</p>
            <p style={{fontSize:11,color:'#9c7fb5'}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{display:'flex',gap:8}}>
        {difficulties.map(d => (
          <button key={d} onClick={() => setFilter(d)} style={{
            padding:'6px 16px', borderRadius:999, border:'none', cursor:'pointer',
            background: filter===d ? '#ec4899' : '#fce7f3',
            color: filter===d ? 'white' : '#9c7fb5',
            fontWeight:600, fontSize:13, fontFamily:'DM Sans,sans-serif',
            transition:'all 0.15s', textTransform:'capitalize',
          }}>{d}</button>
        ))}
        <span style={{marginLeft:'auto',fontSize:12,color:'#9c7fb5',alignSelf:'center'}}>
          {filtered.length} record{filtered.length!==1?'s':''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',background:'#fdf2f8',borderRadius:14,border:'1px dashed #fbcfe8'}}>
          <p style={{fontSize:32,marginBottom:8}}>📋</p>
          <p style={{color:'#9c7fb5'}}>No quiz history yet. Take a quiz to see it here!</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {/* Header */}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr',gap:8,padding:'8px 14px',background:'#fdf2f8',borderRadius:10,fontSize:11,fontWeight:700,color:'#9c7fb5',textTransform:'uppercase',letterSpacing:0.5}}>
            <span>Topic</span>
            <span>Score</span>
            <span>Accuracy</span>
            <span>Difficulty</span>
            <span>Date</span>
          </div>

          {filtered.map((h, i) => {
            const pct = h.accuracy;
            const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f472b6' : '#9c7fb5';
            const icon  = pct >= 80 ? '🏆' : pct >= 60 ? '🌸' : '📚';
            const diffColor = {easy:'#22c55e',medium:'#f472b6',hard:'#9333ea'}[h.difficulty] || '#9c7fb5';
            return (
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr',gap:8,padding:'12px 14px',background:'white',border:'1px solid #fce7f3',borderRadius:10,alignItems:'center',fontSize:13}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <div>
                    <p style={{fontWeight:600,color:'#2d1b2e',fontSize:13}}>{h.topic}</p>
                    {h.doc_names && <p style={{fontSize:11,color:'#9c7fb5'}}>{h.doc_names}</p>}
                  </div>
                </div>
                <span style={{fontWeight:700,color}}>{h.score}/{h.total}</span>
                <div>
                  <div style={{height:4,background:'#fce7f3',borderRadius:999,marginBottom:3,width:60}}>
                    <div style={{width:`${pct}%`,maxWidth:'100%',height:'100%',background:`linear-gradient(90deg,#f472b6,#22c55e)`,borderRadius:999}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color}}>{pct}%</span>
                </div>
                <span style={{background:`${diffColor}20`,color:diffColor,borderRadius:999,padding:'2px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize',display:'inline-block'}}>{h.difficulty}</span>
                <span style={{color:'#9c7fb5',fontSize:11}}>{new Date(h.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
