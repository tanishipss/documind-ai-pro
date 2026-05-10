import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.login({ email, password });
    localStorage.setItem('token', r.data.access_token);
    setUser(r.data.user);
    return r.data;
  };

  const signup = async (email, password, name) => {
    const r = await authAPI.signup({ email, password, name });
    localStorage.setItem('token', r.data.access_token);
    setUser(r.data.user);
    return r.data;
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
