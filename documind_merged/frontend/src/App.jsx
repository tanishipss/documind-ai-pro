import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Landing from './Landing';
import { LoginPage, SignupPage, VerifyEmailPage } from './AuthPages';
import AppMain from './AppMain';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'linear-gradient(135deg,#fdf2f8,#f0fdf4)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="loading-spinner" style={{ width:40, height:40, borderWidth:3, margin:'0 auto 16px' }} />
        <p style={{ color:'#9c7fb5', fontSize:14 }}>Loading DocuMind...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/app" /> : children;
}

export default function Root() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"             element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login"        element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup"       element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/app"          element={<ProtectedRoute><AppMain /></ProtectedRoute>} />
          <Route path="*"             element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
