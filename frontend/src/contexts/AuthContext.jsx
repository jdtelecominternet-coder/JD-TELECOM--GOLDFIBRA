import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jd_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  async function login(jd_id, password) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { jd_id, password });
      localStorage.setItem('jd_token', data.token);
      localStorage.setItem('jd_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('jd_token');
    localStorage.removeItem('jd_user');
    setUser(null);
  }

  function updateUser(updates) {
    const updated = { ...user, ...updates };
    localStorage.setItem('jd_user', JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
