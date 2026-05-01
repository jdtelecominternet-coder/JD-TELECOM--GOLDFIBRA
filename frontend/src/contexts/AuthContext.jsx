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

  // Atualiza permissões do servidor automaticamente ao carregar o app
  // E valida se o usuário ainda existe
  useEffect(() => {
    if (!user) return;
    api.get('/users/me').then(r => {
      if (r.data && r.data.permissions !== undefined) {
        const updated = { ...user, permissions: r.data.permissions };
        localStorage.setItem('jd_user', JSON.stringify(updated));
        setUser(updated);
      }
    }).catch(err => {
      // Se usuário não existe mais (404) ou não autorizado (401), faz logout
      if (err.response?.status === 404 || err.response?.status === 401) {
        logout();
        window.location.href = '/login';
      }
    });
  }, []);

  function loginWithToken(token, userData) {
    localStorage.setItem('jd_token', token);
    localStorage.setItem('jd_user', JSON.stringify(userData));
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
