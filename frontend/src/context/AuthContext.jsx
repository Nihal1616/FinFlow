import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ff_token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user whenever token changes
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((token, user) => {
    localStorage.setItem('ff_token', token);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ff_token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
