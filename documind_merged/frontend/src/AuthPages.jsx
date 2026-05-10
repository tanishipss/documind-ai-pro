import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { authAPI } from './api';

function AuthCard({ title, subtitle, children }) {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-10%', right:'-5%', width:300, height:300, background:'radial-gradient(circle,#fbcfe8,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', left:'-5%', width:350, height:350, background:'radial-gradient(circle,#bbf7d0,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div className="card animate-fade" style={{ width:'100%', maxWidth:440, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📚</div>
          <h2 style={{ fontSize:26, color:'#2d1b2e', marginBottom:6 }}>{title}</h2>
          <p style={{ color:'#9c7fb5', fontSize:14 }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Verification banner ── */
function VerificationBanner({ email, onResend }) {
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState(null);

  const resend = async () => {
    try {
      const r = await onResend();
      setSent(true);
      if (r?.data?.dev_token) setDevToken(r.data.dev_token);
    } catch {}
  };

  return (
    <div style={{ padding:'14px 18px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, marginBottom:20 }}>
      <p style={{ fontWeight:700, fontSize:14, color:'#92400e', marginBottom:6 }}>📧 Verify your email</p>
      <p style={{ fontSize:13, color:'#78350f', marginBottom:10 }}>
        A verification link was sent to <strong>{email}</strong>. Check your inbox (and spam folder).
      </p>
      {devToken && (
        <div style={{ background:'#fef3c7', borderRadius:8, padding:'8px 12px', marginBottom:8, fontSize:12, color:'#92400e', wordBreak:'break-all' }}>
          <strong>Dev mode — click to verify:</strong><br/>
          <a href={`http://localhost:5173/verify-email?token=${devToken}`} style={{ color:'#d97706' }}>
            http://localhost:5173/verify-email?token={devToken}
          </a>
        </div>
      )}
      {!sent ? (
        <button onClick={resend} style={{ background:'none', border:'1px solid #fde68a', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13, color:'#92400e', fontFamily:'DM Sans,sans-serif' }}>
          Resend verification email
        </button>
      ) : (
        <p style={{ fontSize:13, color:'#16a34a', fontWeight:600 }}>✓ Verification email resent!</p>
      )}
    </div>
  );
}

/* ── Login ── */
export function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [unverified, setUnverified] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await login(email, password);
      if (!r.user.is_verified) { setUnverified(true); return; }
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  if (unverified) return (
    <AuthCard title="Check your email" subtitle="One step left before you can start learning">
      <VerificationBanner email={email} onResend={authAPI.resendVerification} />
      <p style={{ textAlign:'center', fontSize:13, color:'#9c7fb5' }}>
        Already verified?{' '}
        <button onClick={() => { setUnverified(false); navigate('/app'); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#ec4899', fontWeight:600, fontFamily:'DM Sans,sans-serif' }}>
          Continue →
        </button>
      </p>
    </AuthCard>
  );

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue learning">
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:'#5c4a6e', display:'block', marginBottom:6 }}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:'#5c4a6e', display:'block', marginBottom:6 }}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#ef4444', fontSize:13 }}>{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop:8, width:'100%', padding:'14px' }}>
          {loading ? <span className="loading-spinner"/> : 'Sign In'}
        </button>
      </form>
      <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#9c7fb5' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color:'#ec4899', fontWeight:600, textDecoration:'none' }}>Sign up</Link>
      </p>
    </AuthCard>
  );
}

/* ── Signup ── */
export function SignupPage() {
  const [form,    setForm]    = useState({ name:'', email:'', password:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(null);   // { email, devToken }
  const { signup } = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await signup(form.email, form.password, form.name);
      setDone({ email: form.email, devToken: r.dev_token });
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally { setLoading(false); }
  };

  if (done) return (
    <AuthCard title="Almost there!" subtitle="Verify your email to get started">
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ textAlign:'center', padding:'20px', background:'#f0fdf4', borderRadius:12, border:'1px solid #bbf7d0' }}>
          <p style={{ fontSize:32, marginBottom:8 }}>📬</p>
          <p style={{ fontWeight:700, color:'#16a34a', marginBottom:6 }}>Verification email sent!</p>
          <p style={{ fontSize:13, color:'#5c4a6e' }}>We sent a link to <strong>{done.email}</strong></p>
        </div>
        {done.devToken && (
          <div style={{ padding:'12px 14px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:6 }}>🛠 Dev mode — SMTP not configured</p>
            <p style={{ fontSize:12, color:'#78350f', marginBottom:8 }}>Click this link to verify instantly:</p>
            <a href={`/verify-email?token=${done.devToken}`}
              style={{ display:'block', background:'#d97706', color:'white', borderRadius:8, padding:'8px 14px', textDecoration:'none', textAlign:'center', fontWeight:600, fontSize:13 }}>
              Verify Email →
            </a>
          </div>
        )}
        <button className="btn-ghost" onClick={() => navigate('/login')} style={{ textAlign:'center' }}>
          Back to Sign In
        </button>
      </div>
    </AuthCard>
  );

  const update = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <AuthCard title="Create account" subtitle="Start your learning journey">
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:'#5c4a6e', display:'block', marginBottom:6 }}>Name</label>
          <input type="text" value={form.name} onChange={update('name')} placeholder="Your name" required />
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:'#5c4a6e', display:'block', marginBottom:6 }}>Email</label>
          <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:'#5c4a6e', display:'block', marginBottom:6 }}>Password</label>
          <input type="password" value={form.password} onChange={update('password')} placeholder="Min 6 characters" minLength={6} required />
        </div>
        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#ef4444', fontSize:13 }}>{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop:8, width:'100%', padding:'14px' }}>
          {loading ? <span className="loading-spinner"/> : 'Create Account →'}
        </button>
      </form>
      <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#9c7fb5' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color:'#ec4899', fontWeight:600, textDecoration:'none' }}>Sign in</Link>
      </p>
    </AuthCard>
  );
}

/* ── Email Verification Page ── */
export function VerifyEmailPage() {
  const [params]  = useSearchParams();
  const [status,  setStatus]  = useState('loading');  // loading | success | error
  const [message, setMessage] = useState('');
  const navigate  = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token found in URL.'); return; }
    authAPI.verifyEmail(token)
      .then(r => { setStatus('success'); setMessage(r.data.message); })
      .catch(e => { setStatus('error'); setMessage(e.response?.data?.detail || 'Verification failed'); });
  }, []);

  return (
    <AuthCard
      title={status==='loading'?'Verifying…':status==='success'?'Email Verified! ✅':'Verification Failed ❌'}
      subtitle={status==='loading'?'Please wait…':''}
    >
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        {status === 'loading' && <span className="loading-spinner" style={{ width:40, height:40, borderWidth:3, display:'inline-block' }} />}
        {status === 'success' && (
          <>
            <p style={{ fontSize:36, marginBottom:12 }}>🎉</p>
            <p style={{ fontSize:15, color:'#16a34a', fontWeight:600, marginBottom:20 }}>{message}</p>
            <button className="btn-primary" onClick={() => navigate('/app')} style={{ width:'100%', padding:'14px' }}>
              Go to DocuMind →
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ fontSize:36, marginBottom:12 }}>😕</p>
            <p style={{ fontSize:14, color:'#ef4444', marginBottom:20 }}>{message}</p>
            <button className="btn-ghost" onClick={() => navigate('/login')} style={{ width:'100%' }}>Back to Login</button>
          </>
        )}
      </div>
    </AuthCard>
  );
}
