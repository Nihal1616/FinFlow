import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Decode JWT payload (no verification, just reading)
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch { return {}; }
}

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ff_token'));
  const [loading, setLoading] = useState(true);
  const [isDecoySession, setIsDecoySession] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const payload = parseJwt(token);
    setIsDecoySession(payload.isDecoySession === true);
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        setIsDecoySession(data.isDecoySession === true);
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((tok, user) => {
    localStorage.setItem('ff_token', tok);
    setToken(tok);
    setUser(user);
    const payload = parseJwt(tok);
    setIsDecoySession(payload.isDecoySession === true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ff_token');
    setToken(null);
    setUser(null);
    setIsDecoySession(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading, isDecoySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
