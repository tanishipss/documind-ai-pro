import { useState } from 'react';
import { aiAPI } from './api';

export default function Flashcards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState({});
  const [current, setCurrent] = useState(0);

  const generate = async () => {
    setLoading(true);
    setError('');
    setFlipped({});
    setCurrent(0);
    try {
      const r = await aiAPI.generateFlashcards();
      setCards(r.data.flashcards || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (id) => {
    setFlipped(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!cards.length && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
          <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>🃏 Flashcards</h3>
          <p style={{ fontSize: 13, color: '#5c4a6e' }}>AI generates 10 flashcards from your documents. Click any card to reveal the answer.</p>
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#ef4444', fontSize: 13 }}>{error}</div>}
        <button className="btn-green" onClick={generate} style={{ padding: '14px', fontSize: 16 }}>Generate Flashcards 🃏</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 20px' }} />
        <p style={{ color: '#9c7fb5' }}>Creating flashcards...</p>
      </div>
    );
  }

  const card = cards[current];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#9c7fb5' }}>{current + 1} / {cards.length}</span>
        <span style={{ fontSize: 12, background: '#f0fdf4', color: '#22c55e', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
          {Object.keys(flipped).filter(k => flipped[k]).length} flipped
        </span>
      </div>

      {/* Main Flashcard */}
      <div
        onClick={() => toggleFlip(current)}
        style={{
          cursor: 'pointer',
          perspective: 600,
          height: 220,
          userSelect: 'none',
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: flipped[current] ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
            border: '2px solid #fbcfe8', borderRadius: 18,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 24px', textAlign: 'center',
          }}>
            <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#f472b6', fontWeight: 700, marginBottom: 14 }}>
              {card.category || 'Concept'}
            </span>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#2d1b2e', lineHeight: 1.5, marginBottom: 16 }}>{card.front}</p>
            <p style={{ fontSize: 12, color: '#c4b5d0' }}>Tap to reveal answer</p>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '2px solid #86efac', borderRadius: 18,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 24px', textAlign: 'center',
          }}>
            <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#22c55e', fontWeight: 700, marginBottom: 14 }}>Answer</span>
            <p style={{ fontSize: 15, color: '#2d1b2e', lineHeight: 1.6 }}>{card.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-ghost" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ flex: 1 }}>← Prev</button>
        <button className="btn-green" onClick={() => setCurrent(c => Math.min(cards.length - 1, c + 1))} disabled={current === cards.length - 1} style={{ flex: 1 }}>Next →</button>
      </div>

      {/* All cards grid */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#9c7fb5', marginBottom: 12 }}>All Cards</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
          {cards.map((c, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              padding: '10px 8px', borderRadius: 10, border: `2px solid ${i === current ? '#f472b6' : flipped[i] ? '#86efac' : '#fce7f3'}`,
              background: i === current ? '#fdf2f8' : flipped[i] ? '#f0fdf4' : 'white',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: i === current ? '#ec4899' : flipped[i] ? '#22c55e' : '#9c7fb5',
              transition: 'all 0.2s',
            }}>
              {i + 1}
              {flipped[i] && <span style={{ display: 'block', fontSize: 10, marginTop: 2 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-ghost" onClick={generate} style={{ fontSize: 13 }}>Regenerate Cards</button>
    </div>
  );
}
