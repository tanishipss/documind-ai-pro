import { useState, useEffect } from 'react';
import { authAPI } from './api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';

/* ── Streak ── */
function useStreak() {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem('documind_streak') || '{"streak":0,"lastDate":""}');
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    let s = saved.streak;
    if (saved.lastDate === today) { s = saved.streak; }
    else if (saved.lastDate === yesterday.toDateString()) {
      s = saved.streak + 1;
      localStorage.setItem('documind_streak', JSON.stringify({ streak: s, lastDate: today }));
    } else {
      s = 1;
      localStorage.setItem('documind_streak', JSON.stringify({ streak: 1, lastDate: today }));
    }
    setStreak(s);
  }, []);
  return streak;
}

/* ── Tooltip ── */
const PinkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'#9c7fb5', marginBottom:4 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color: p.color || '#ec4899', fontWeight:700 }}>{p.name}: {p.value}{p.name==='accuracy'?'%':''}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [progress, setProgress] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('overview');
  const streak = useStreak();

  const load = () => {
    setLoading(true);
    authAPI.getProgress()
      .then(r => setProgress(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return (
    <div style={{ textAlign:'center', padding:60 }}><span className="loading-spinner" style={{ width:36, height:36, borderWidth:3 }} /></div>
  );

  const scores     = progress?.scores        || [];
  const weakAreas  = progress?.weak_areas    || [];
  const guidance   = progress?.guidance      || [];
  const accuracyTrend = progress?.accuracy_trend || [];

  /* derived */
  const avgScore   = scores.length ? Math.round(scores.reduce((a,s) => a + s.accuracy, 0) / scores.length) : 0;
  const bestScore  = scores.length ? Math.max(...scores.map(s => s.accuracy)) : 0;
  const totalQs    = scores.reduce((a,s) => a + s.total, 0);

  const trendData  = accuracyTrend.map((s,i) => ({
    quiz:     `Q${i+1}`,
    accuracy: s.accuracy,
    difficulty: s.difficulty,
    topic:    s.topic?.slice(0,20),
  }));

  const weakChartData = weakAreas
    .slice(0, 8)
    .map(w => ({ topic: w.topic.slice(0,22), misses: w.miss_count }));

  /* difficulty breakdown */
  const diffBreak = scores.reduce((a,s) => {
    a[s.difficulty] = (a[s.difficulty] || 0) + 1; return a;
  }, {});
  const diffData = Object.entries(diffBreak).map(([d,c]) => ({ name: d, count: c }));

  const tabStyle = (t) => ({
    padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer',
    fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:13,
    background: tab===t ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'white',
    color: tab===t ? 'white' : '#9c7fb5',
    boxShadow: tab===t ? '0 2px 8px rgba(236,72,153,0.3)' : 'none',
    transition:'all 0.2s',
  });

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {[['overview','📊 Overview'],['trend','📈 Accuracy Trend'],['weak','🎯 Weak Areas'],['guidance','📖 Guidance'],['history','🕐 History']].map(([id,label]) => (
          <button key={id} style={tabStyle(id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            {[
              { label:'Quizzes Taken',   value: scores.length,        icon:'📝', color:'#ec4899' },
              { label:'Avg Accuracy',    value: `${avgScore}%`,       icon:'🎯', color:'#22c55e' },
              { label:'Day Streak',      value: `${streak} 🔥`,      icon:'⚡', color:'#f59e0b' },
              { label:'Questions Done',  value: totalQs,              icon:'✅', color:'#3b82f6' },
              { label:'Best Score',      value: `${Math.round(bestScore)}%`, icon:'🏆', color:'#a855f7' },
              { label:'Weak Topics',     value: weakAreas.length,     icon:'📚', color:'#9c7fb5' },
            ].map(s => (
              <div key={s.label} style={{ padding:'16px', background:'white', border:'1px solid #fce7f3', borderRadius:14, textAlign:'center' }}>
                <div style={{ fontSize:26, marginBottom:4 }}>{s.icon}</div>
                <p style={{ fontSize:20, fontWeight:700, color:s.color, marginBottom:2 }}>{s.value}</p>
                <p style={{ fontSize:12, color:'#9c7fb5' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mini trend preview */}
          {trendData.length > 1 && (
            <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:16, padding:'20px 16px' }}>
              <p style={{ fontWeight:700, fontSize:14, color:'#5c4a6e', marginBottom:12 }}>📈 Recent accuracy</p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={trendData.slice(-8)}>
                  <defs>
                    <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f472b6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                  <XAxis dataKey="quiz" tick={{ fontSize:10, fill:'#9c7fb5' }} />
                  <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#9c7fb5' }} />
                  <Tooltip content={<PinkTooltip />} />
                  <Area type="monotone" dataKey="accuracy" name="accuracy" stroke="#ec4899" fill="url(#pinkGrad)" strokeWidth={2} dot={{ r:3, fill:'#ec4899' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Difficulty split */}
          {diffData.length > 0 && (
            <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:16, padding:'20px 16px' }}>
              <p style={{ fontWeight:700, fontSize:14, color:'#5c4a6e', marginBottom:12 }}>🎲 Quizzes by difficulty</p>
              <div style={{ display:'flex', gap:12 }}>
                {diffData.map(d => (
                  <div key={d.name} style={{ flex:1, textAlign:'center', padding:'12px 8px', background:d.name==='easy'?'#f0fdf4':d.name==='medium'?'#fdf2f8':'#faf5ff', borderRadius:10, border:`1px solid ${d.name==='easy'?'#bbf7d0':d.name==='medium'?'#fce7f3':'#e9d5ff'}` }}>
                    <p style={{ fontSize:22, fontWeight:700, color:d.name==='easy'?'#22c55e':d.name==='medium'?'#ec4899':'#a855f7' }}>{d.count}</p>
                    <p style={{ fontSize:12, color:'#9c7fb5', textTransform:'capitalize' }}>{d.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scores.length === 0 && (
            <div style={{ padding:'32px', background:'#fdf2f8', border:'1px dashed #fbcfe8', borderRadius:14, textAlign:'center' }}>
              <p style={{ fontSize:32, marginBottom:10 }}>📚</p>
              <p style={{ color:'#9c7fb5', fontSize:14 }}>No quizzes yet — upload a document and take your first quiz!</p>
            </div>
          )}
        </>
      )}

      {/* ── Accuracy Trend ── */}
      {tab === 'trend' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {trendData.length > 0 ? (
            <>
              <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:16, padding:'20px 16px' }}>
                <p style={{ fontWeight:700, fontSize:15, color:'#5c4a6e', marginBottom:16 }}>📈 Accuracy over time</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                    <XAxis dataKey="quiz" tick={{ fontSize:11, fill:'#9c7fb5' }} />
                    <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'#9c7fb5' }} unit="%" />
                    <Tooltip content={<PinkTooltip />} />
                    <Line type="monotone" dataKey="accuracy" name="accuracy" stroke="#ec4899" strokeWidth={2.5} dot={{ fill:'#ec4899', r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* All scores table */}
              <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:16, padding:'20px' }}>
                <p style={{ fontWeight:700, fontSize:14, color:'#5c4a6e', marginBottom:14 }}>All quiz results</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
                  {[...scores].reverse().map((s,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#fdf2f8', borderRadius:10 }}>
                      <span style={{ fontSize:16 }}>{s.accuracy>=80?'🏆':s.accuracy>=60?'🌸':'📚'}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:600, fontSize:13, color:'#2d1b2e' }}>{s.topic}</p>
                        <p style={{ fontSize:11, color:'#9c7fb5', textTransform:'capitalize' }}>
                          {s.difficulty} · {s.score}/{s.total} · {new Date(s.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{ fontWeight:700, color:s.accuracy>=80?'#22c55e':s.accuracy>=60?'#f472b6':'#9c7fb5', fontSize:15 }}>
                        {Math.round(s.accuracy)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding:'32px', background:'#fdf2f8', border:'1px dashed #fbcfe8', borderRadius:14, textAlign:'center' }}>
              <p style={{ color:'#9c7fb5' }}>Take quizzes to see your accuracy trend</p>
            </div>
          )}
        </div>
      )}

      {/* ── Weak Areas ── */}
      {tab === 'weak' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {weakAreas.length > 0 ? (
            <>
              <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:16, padding:'20px 16px' }}>
                <p style={{ fontWeight:700, fontSize:15, color:'#5c4a6e', marginBottom:16 }}>🎯 Topics to improve</p>
                <ResponsiveContainer width="100%" height={Math.max(160, weakChartData.length * 36)}>
                  <BarChart data={weakChartData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize:11, fill:'#9c7fb5' }} />
                    <YAxis type="category" dataKey="topic" tick={{ fontSize:11, fill:'#9c7fb5' }} width={130} />
                    <Tooltip formatter={v => [v, 'missed answers']} />
                    <Bar dataKey="misses" name="misses" fill="#f9a8d4" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {weakAreas.map((w,i) => (
                  <div key={i} style={{ padding:'14px 18px', background:'white', border:'1px solid #fce7f3', borderRadius:12, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#f472b6,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 }}>
                      {w.miss_count}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:14, color:'#2d1b2e' }}>{w.topic}</p>
                      <p style={{ fontSize:12, color:'#9c7fb5' }}>
                        Missed {w.miss_count} time{w.miss_count!==1?'s':''} · last {new Date(w.last_seen).toLocaleDateString()}
                      </p>
                    </div>
                    <span style={{ fontSize:12, background:'#fce7f3', color:'#ec4899', borderRadius:999, padding:'3px 10px', fontWeight:600 }}>Review</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding:'32px', background:'#f0fdf4', border:'1px dashed #bbf7d0', borderRadius:14, textAlign:'center' }}>
              <p style={{ fontSize:28, marginBottom:8 }}>🌟</p>
              <p style={{ color:'#22c55e', fontWeight:600 }}>No weak areas detected yet</p>
              <p style={{ fontSize:13, color:'#9c7fb5', marginTop:4 }}>Keep taking quizzes to identify concepts to improve</p>
            </div>
          )}
        </div>
      )}

      {/* ── Personalized Guidance ── */}
      {tab === 'guidance' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'14px 18px', background:'#fdf2f8', border:'1px solid #fce7f3', borderRadius:12 }}>
            <p style={{ fontWeight:600, fontSize:14, color:'#ec4899', marginBottom:4 }}>📖 Personalized Learning Guidance</p>
            <p style={{ fontSize:13, color:'#9c7fb5' }}>
              Document passages mapped to your weak areas — read these to improve your score.
            </p>
          </div>

          {guidance.length > 0 ? (
            guidance.map((g,i) => (
              <div key={i} style={{ background:'white', border:'1px solid #fce7f3', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', borderBottom:'1px solid #fce7f3', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16 }}>🎯</span>
                  <p style={{ fontWeight:700, fontSize:13, color:'#2d1b2e' }}>{g.topic}</p>
                  {g.doc_name && <span style={{ marginLeft:'auto', fontSize:11, color:'#9c7fb5' }}>{g.doc_name}</span>}
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <p style={{ fontSize:13, color:'#5c4a6e', lineHeight:1.7, marginBottom:10 }}>{g.passage}</p>
                  <div style={{ padding:'10px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, fontSize:12, color:'#16a34a' }}>
                    💡 {g.action || `Re-read the section on "${g.topic}" in your document, then retry the quiz.`}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding:'32px', background:'#fdf2f8', border:'1px dashed #fbcfe8', borderRadius:14, textAlign:'center' }}>
              <p style={{ color:'#9c7fb5', fontSize:14 }}>
                Guidance passages appear here after you take a quiz and get questions wrong.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Full Quiz History ── */}
      {tab === 'history' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontWeight:700, fontSize:15, color:'#5c4a6e' }}>
              {scores.length} quiz{scores.length!==1?'zes':''} completed
            </p>
            <button onClick={load} style={{ background:'none', border:'1px solid #fce7f3', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, color:'#9c7fb5', fontFamily:'DM Sans,sans-serif' }}>
              ↻ Refresh
            </button>
          </div>

          {scores.length > 0 ? (
            <div style={{ background:'white', border:'1px solid #fce7f3', borderRadius:16, overflow:'hidden' }}>
              {/* Header */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 80px 100px', gap:8, padding:'10px 16px', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', borderBottom:'1px solid #fce7f3', fontSize:11, fontWeight:700, color:'#9c7fb5', textTransform:'uppercase', letterSpacing:0.5 }}>
                <span>Topic</span><span>Score</span><span>Accuracy</span><span>Diff.</span><span>Date</span>
              </div>
              <div style={{ maxHeight:460, overflowY:'auto' }}>
                {[...scores].reverse().map((s,i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 80px 100px', gap:8, padding:'12px 16px', borderBottom:'1px solid #fce7f3', alignItems:'center', background:i%2===0?'white':'#fefcfb' }}>
                    <div>
                      <p style={{ fontWeight:600, fontSize:13, color:'#2d1b2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.topic}</p>
                      {s.doc_names && <p style={{ fontSize:11, color:'#c4b5d0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.doc_names}</p>}
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color:'#5c4a6e' }}>{s.score}/{s.total}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:s.accuracy>=80?'#22c55e':s.accuracy>=60?'#f472b6':'#9c7fb5' }}>
                      {Math.round(s.accuracy)}%
                    </span>
                    <span style={{ fontSize:11, background:s.difficulty==='easy'?'#f0fdf4':s.difficulty==='medium'?'#fdf2f8':'#faf5ff', color:s.difficulty==='easy'?'#22c55e':s.difficulty==='medium'?'#ec4899':'#a855f7', borderRadius:999, padding:'2px 8px', textTransform:'capitalize', textAlign:'center' }}>
                      {s.difficulty}
                    </span>
                    <span style={{ fontSize:11, color:'#9c7fb5' }}>{new Date(s.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding:'32px', background:'#fdf2f8', border:'1px dashed #fbcfe8', borderRadius:14, textAlign:'center' }}>
              <p style={{ color:'#9c7fb5' }}>No quiz history yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
