import { useState } from 'react';
import { aiAPI, authAPI } from './api';

const SECTION_BADGE = {
  matched: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: '🔗 Matched Section' },
  updated: { bg: '#fdf2f8', color: '#ec4899', border: '#fbcfe8', label: '🆕 Updated Section' },
  standard:{ bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff', label: '📄 Document' },
};

export default function Quiz() {
  const [difficulty,  setDifficulty]  = useState('medium');
  const [numQuestions,setNumQuestions]= useState(10);
  const [quiz,        setQuiz]        = useState(null);
  const [current,     setCurrent]     = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [submitted,   setSubmitted]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [loadingMode, setLoadingMode] = useState('');
  const [error,       setError]       = useState('');
  const [weakAreas,   setWeakAreas]   = useState(null);

  const reset = () => { setQuiz(null); setAnswers({}); setSubmitted(false); setWeakAreas(null); setCurrent(0); setError(''); };

  const generate = async (mode = 'standard') => {
    setLoading(true); setLoadingMode(mode); reset();
    try {
      const r = mode === 'regen'
        ? await aiAPI.regenForChanges(difficulty, numQuestions)
        : await aiAPI.generateQuiz(difficulty, numQuestions);
      setQuiz(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate quiz. Ensure Ollama is running.');
    } finally { setLoading(false); setLoadingMode(''); }
  };

  const submitQuiz = async () => {
    setSubmitted(true);
    const questions = quiz.questions;
    const wrong     = questions
      .filter(q => answers[q.id - 1] !== q.correct)
      .map(q => ({ question: q.question, topic: q.topic, user_answer: answers[q.id - 1] }));
    const score = questions.length - wrong.length;

    try {
      const wa = await aiAPI.detectWeakAreas(wrong);
      setWeakAreas(wa.data);
      const guidancePassages = wa.data?.relevant_passages || {};
      const mode = quiz.rag_info?.mode || 'standard';
      await authAPI.saveScore({
        score, total: questions.length, difficulty,
        topic:             questions[0]?.topic || 'Document Quiz',
        weak_areas:        wrong.map(w => w.topic),
        guidance_passages: guidancePassages,
        mode,
      });
    } catch (e) { console.error(e); }
  };

  const diffColors = {
    easy:   { bg:'#f0fdf4', border:'#bbf7d0', text:'#16a34a', active:'#22c55e' },
    medium: { bg:'#fdf2f8', border:'#fbcfe8', text:'#ec4899', active:'#f472b6' },
    hard:   { bg:'#faf5ff', border:'#e9d5ff', text:'#9333ea', active:'#a855f7' },
  };

  // ── Setup screen ──
  if (!quiz && !loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Difficulty */}
        <div>
          <h3 style={{ fontSize:16, marginBottom:14, color:'#2d1b2e' }}>Choose Difficulty</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {['easy','medium','hard'].map(d => {
              const c = diffColors[d]; const active = difficulty === d;
              return (
                <button key={d} onClick={() => setDifficulty(d)} style={{ padding:'16px 12px', borderRadius:12, border:`2px solid ${active?c.active:c.border}`, background:active?c.bg:'white', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{d==='easy'?'🌱':d==='medium'?'🌸':'🔥'}</div>
                  <p style={{ fontWeight:700, color:active?c.active:'#5c4a6e', textTransform:'capitalize', fontSize:14 }}>{d}</p>
                  <p style={{ fontSize:11, color:'#9c7fb5', marginTop:2 }}>{d==='easy'?'Recall & basics':d==='medium'?'Analysis & apply':'Critical thinking'}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Number of questions */}
        <div>
          <h3 style={{ fontSize:16, marginBottom:10, color:'#2d1b2e' }}>Number of Questions</h3>
          <div style={{ display:'flex', gap:10 }}>
            {[10,12,15].map(n => (
              <button key={n} onClick={() => setNumQuestions(n)} style={{ flex:1, padding:'12px 8px', borderRadius:10, border:`2px solid ${numQuestions===n?'#ec4899':'#fce7f3'}`, background:numQuestions===n?'#fdf2f8':'white', cursor:'pointer', fontWeight:700, fontSize:16, color:numQuestions===n?'#ec4899':'#9c7fb5', fontFamily:'DM Sans,sans-serif', transition:'all 0.2s' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'12px 16px', background:'#fdf2f8', border:'1px solid #fce7f3', borderRadius:12, fontSize:13, color:'#9c7fb5' }}>
          📋 {numQuestions} questions · RAG-grounded from your document(s)
        </div>

        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#ef4444', fontSize:13 }}>{error}</div>}

        <button className="btn-primary" onClick={() => generate('standard')} style={{ padding:'14px', fontSize:16 }}>
          Generate Quiz ✨
        </button>
        <button className="btn-green" onClick={() => generate('regen')} style={{ padding:'12px', fontSize:14 }}>
          🔁 Updated Sections Only (2 docs required)
        </button>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ textAlign:'center', padding:'60px 20px' }}>
        <div className="loading-spinner" style={{ width:40, height:40, borderWidth:3, margin:'0 auto 20px' }} />
        <p style={{ color:'#9c7fb5', fontSize:15 }}>
          {loadingMode === 'regen' ? 'Generating questions for updated sections…' : 'AI is crafting your quiz…'}
        </p>
        {quiz?.rag_info?.mode === 'dual-doc (matched + updated)' && (
          <p style={{ color:'#c4b5d0', fontSize:13, marginTop:6 }}>Building questions from matched AND updated sections</p>
        )}
        <p style={{ color:'#c4b5d0', fontSize:13, marginTop:6 }}>This may take 30–60 seconds</p>
      </div>
    );
  }

  const questions = quiz.questions;
  const q         = questions[current];
  const progress  = (Object.keys(answers).length / questions.length) * 100;
  const badge     = SECTION_BADGE[q?.section_type] || SECTION_BADGE.standard;

  // ── Results screen ──
  if (submitted) {
    const score = questions.filter(q => answers[q.id - 1] === q.correct).length;
    const pct   = Math.round((score / questions.length) * 100);

    // Count by section
    const matchedTotal   = questions.filter(q => q.section_type === 'matched').length;
    const updatedTotal   = questions.filter(q => q.section_type === 'updated').length;
    const matchedCorrect = questions.filter(q => q.section_type === 'matched' && answers[q.id-1] === q.correct).length;
    const updatedCorrect = questions.filter(q => q.section_type === 'updated' && answers[q.id-1] === q.correct).length;

    return (
      <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:18 }}>

        {/* Score card */}
        <div style={{ textAlign:'center', padding:'28px 20px', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', borderRadius:16, border:'1px solid #fce7f3' }}>
          <div style={{ fontSize:52, marginBottom:8 }}>{pct>=80?'🏆':pct>=60?'🌸':'📚'}</div>
          <h2 style={{ fontSize:36, color:'#2d1b2e', marginBottom:4 }}>{score}/{questions.length}</h2>
          <p style={{ fontSize:18, fontWeight:600, color:pct>=80?'#22c55e':pct>=60?'#f472b6':'#9c7fb5' }}>
            {pct}% — {pct>=80?'Excellent!':pct>=60?'Good work!':'Keep practicing!'}
          </p>
        </div>

        {/* Section breakdown (only show if dual-doc) */}
        {(matchedTotal > 0 && updatedTotal > 0) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ padding:'14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, textAlign:'center' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>🔗 Matched Sections</p>
              <p style={{ fontSize:22, fontWeight:700, color:'#16a34a' }}>{matchedCorrect}/{matchedTotal}</p>
              <p style={{ fontSize:12, color:'#9c7fb5' }}>{matchedTotal>0?Math.round((matchedCorrect/matchedTotal)*100):0}% accuracy</p>
            </div>
            <div style={{ padding:'14px', background:'#fdf2f8', border:'1px solid #fbcfe8', borderRadius:12, textAlign:'center' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#ec4899', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>🆕 Updated Sections</p>
              <p style={{ fontSize:22, fontWeight:700, color:'#ec4899' }}>{updatedCorrect}/{updatedTotal}</p>
              <p style={{ fontSize:12, color:'#9c7fb5' }}>{updatedTotal>0?Math.round((updatedCorrect/updatedTotal)*100):0}% accuracy</p>
            </div>
          </div>
        )}

        {/* Q breakdown */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {questions.map((q, i) => {
            const correct = answers[i] === q.correct;
            const b = SECTION_BADGE[q.section_type] || SECTION_BADGE.standard;
            return (
              <div key={i} style={{ padding:'14px 16px', borderRadius:12, background:correct?'#f0fdf4':'#fef2f2', border:`1px solid ${correct?'#bbf7d0':'#fecaca'}` }}>
                <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, background:b.bg, color:b.color, border:`1px solid ${b.border}`, borderRadius:999, padding:'2px 8px', fontWeight:600 }}>{b.label}</span>
                  <span style={{ fontSize:11, background:'#fce7f3', color:'#ec4899', borderRadius:999, padding:'2px 8px', fontWeight:600 }}>{q.topic}</span>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <span style={{ fontSize:16 }}>{correct?'✅':'❌'}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, fontSize:13, color:'#2d1b2e', marginBottom:4 }}>Q{i+1}. {q.question}</p>
                    {!correct && <p style={{ fontSize:12, color:'#16a34a', marginBottom:4 }}>✓ Correct: {q.correct}</p>}
                    <p style={{ fontSize:12, color:'#9c7fb5' }}>{q.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weak areas — LLM-powered */}
        {weakAreas?.weak_areas?.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Header */}
            <div style={{ padding:'14px 18px', background:'linear-gradient(135deg,#fdf2f8,#fce7f3)', border:'1px solid #fbcfe8', borderRadius:14 }}>
              <h4 style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, color:'#ec4899', marginBottom:6, fontSize:15 }}>🎯 AI-Powered Weak Area Analysis</h4>
              <p style={{ fontSize:12, color:'#9c7fb5' }}>Our AI analysed your wrong answers and found these areas to review:</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                {weakAreas.weak_areas.map(w => (
                  <span key={w} style={{ background:'#fce7f3', color:'#ec4899', borderRadius:999, padding:'4px 12px', fontSize:12, fontWeight:600 }}>{w}</span>
                ))}
              </div>
            </div>

            {/* Per-topic breakdown with page hints */}
            {weakAreas.guidance?.map((g, i) => (
              <div key={i} style={{ background:'white', border:'1px solid #fce7f3', borderRadius:14, overflow:'hidden' }}>
                {/* Topic header */}
                <div style={{ padding:'10px 16px', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', borderBottom:'1px solid #fce7f3', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:15 }}>📌</span>
                  <p style={{ fontWeight:700, fontSize:13, color:'#2d1b2e', flex:1 }}>{g.topic}</p>
                  {g.estimated_page && (
                    <span style={{ fontSize:11, background:'#fce7f3', color:'#ec4899', borderRadius:999, padding:'3px 10px', fontWeight:600, flexShrink:0 }}>
                      ~Page {g.estimated_page}
                    </span>
                  )}
                  {g.relevance_score && (
                    <span style={{ fontSize:11, background:'#f0fdf4', color:'#16a34a', borderRadius:999, padding:'3px 10px', fontWeight:600, flexShrink:0 }}>
                      {Math.round(g.relevance_score * 100)}% match
                    </span>
                  )}
                </div>

                <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  {/* Why it's weak */}
                  {g.reason && (
                    <p style={{ fontSize:12, color:'#9c7fb5', fontStyle:'italic' }}>⚠️ {g.reason}</p>
                  )}

                  {/* Document passage */}
                  {g.passage && (
                    <div style={{ padding:'10px 12px', background:'#fdf9ff', border:'1px solid #e9d5ff', borderRadius:8 }}>
                      <p style={{ fontSize:11, fontWeight:700, color:'#9333ea', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>
                        📄 From: {g.filename || 'Your document'}
                      </p>
                      <p style={{ fontSize:12, color:'#5c4a6e', lineHeight:1.7 }}>{g.passage}</p>
                    </div>
                  )}

                  {/* Review hint */}
                  <div style={{ padding:'8px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, fontSize:12, color:'#16a34a', fontWeight:500 }}>
                    💡 {g.review_hint || g.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary" onClick={reset}>New Quiz</button>
      </div>
    );
  }

  // ── Active quiz ──
  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* RAG info badge */}
      {quiz?.rag_info && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, fontSize:12, color:'#16a34a', fontWeight:600, flexWrap:'wrap' }}>
          🧠 {quiz.rag_info.mode || 'RAG'} ·{' '}
          {quiz.rag_info.matched_count != null && `${quiz.rag_info.matched_count} matched + ${quiz.rag_info.updated_count} updated`}
          {quiz.rag_info.chunks_used   != null && `${quiz.rag_info.chunks_used} chunks`}
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13, color:'#9c7fb5' }}>
          <span>Q {current+1} of {questions.length}</span>
          <span>{Math.round(progress)}% answered</span>
        </div>
        <div style={{ height:6, background:'#fce7f3', borderRadius:999, overflow:'hidden' }}>
          <div style={{ width:`${progress}%`, height:'100%', background:'linear-gradient(90deg,#f472b6,#22c55e)', borderRadius:999, transition:'width 0.3s' }} />
        </div>
      </div>

      {/* Dot nav */}
      <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
        {questions.map((qu, i) => {
          const b = SECTION_BADGE[qu.section_type] || SECTION_BADGE.standard;
          return (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width:30, height:30, borderRadius:'50%', border:`2px solid ${i===current?'#ec4899':answers[i]!==undefined?b.border:'#fce7f3'}`,
              cursor:'pointer', fontSize:11, fontWeight:700, transition:'all 0.2s',
              background: i===current?'#ec4899':answers[i]!==undefined?b.bg:'white',
              color: i===current?'white':answers[i]!==undefined?b.color:'#9c7fb5',
              transform: i===current?'scale(1.15)':'scale(1)',
              title: qu.section_type,
            }}>{i+1}</button>
          );
        })}
      </div>

      {/* Section badge */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, borderRadius:999, padding:'3px 10px', fontWeight:600 }}>{badge.label}</span>
        <span style={{ fontSize:12, background:'#fce7f3', color:'#ec4899', borderRadius:999, padding:'3px 10px', fontWeight:600 }}>{q?.topic}</span>
      </div>

      {/* Question */}
      <div style={{ padding:'18px 20px', background:'#fdf2f8', border:'1px solid #fce7f3', borderRadius:14 }}>
        <p style={{ fontWeight:600, fontSize:16, color:'#2d1b2e', lineHeight:1.5 }}>{q?.question}</p>
      </div>

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {q?.options.map((opt, i) => {
          const selected = answers[current] === opt;
          return (
            <button key={i} onClick={() => { if (!submitted) setAnswers(p => ({...p,[current]:opt})); }} style={{
              padding:'13px 18px', borderRadius:12, border:`2px solid ${selected?'#f472b6':'#fce7f3'}`,
              background:selected?'#fdf2f8':'white', cursor:'pointer', textAlign:'left',
              fontSize:14, color:selected?'#ec4899':'#5c4a6e', fontWeight:selected?600:400,
              transition:'all 0.2s', fontFamily:'DM Sans,sans-serif',
            }}>{opt}</button>
          );
        })}
      </div>

      {/* Nav */}
      <div style={{ display:'flex', gap:10 }}>
        <button className="btn-ghost" onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0}>← Prev</button>
        {current === questions.length-1 ? (
          <button className="btn-primary" onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length} style={{ flex:1 }}>
            Submit Quiz 🎯
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setCurrent(c => Math.min(questions.length-1,c+1))} style={{ flex:1 }}>
            Next →
          </button>
        )}
      </div>

      {Object.keys(answers).length < questions.length && current === questions.length-1 && (
        <p style={{ fontSize:12, color:'#9c7fb5', textAlign:'center' }}>Answer all {questions.length} questions to submit</p>
      )}
    </div>
  );
}
