import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from './api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return; }
    authAPI.verifyEmail(token)
      .then(r => { setStatus('success'); setMessage(r.data.message); })
      .catch(e => { setStatus('error'); setMessage(e.response?.data?.detail || 'Verification failed.'); });
  }, [token]);

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div className="card animate-fade" style={{maxWidth:420,width:'100%',textAlign:'center',padding:'40px 32px'}}>
        <div style={{fontSize:56,marginBottom:16}}>
          {status==='verifying'?'⏳':status==='success'?'✅':'❌'}
        </div>
        <h2 style={{fontSize:24,color:'#2d1b2e',marginBottom:12}}>
          {status==='verifying'?'Verifying…':status==='success'?'Email Verified!':'Verification Failed'}
        </h2>
        <p style={{fontSize:14,color:'#9c7fb5',marginBottom:24,lineHeight:1.6}}>{message}</p>
        {status==='success' && (
          <button className="btn-primary" onClick={()=>navigate('/login')} style={{width:'100%',padding:'13px'}}>
            Sign In →
          </button>
        )}
        {status==='error' && (
          <button className="btn-ghost" onClick={()=>navigate('/signup')} style={{width:'100%',padding:'13px'}}>
            Back to Sign Up
          </button>
        )}
      </div>
    </div>
  );
}
