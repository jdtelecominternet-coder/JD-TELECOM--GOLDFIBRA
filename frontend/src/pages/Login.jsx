import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { Wifi, Eye, EyeOff, LogIn, Sun, Moon } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [nums, setNums] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (nums.length !== 6) return toast.error('Digite os 6 números do seu ID');
    if (!password) return toast.error('Digite sua senha');
    setLoading(true);
    try {
      await login('JD' + nums, password);
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'ID ou senha inválidos');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-main)' }}>
      {/* Theme toggle */}
      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* BG decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--accent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: 'var(--accent)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
            <Wifi className="w-10 h-10" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            JD TELECOM
          </h1>
          <p className="font-semibold tracking-widest text-sm mt-1" style={{ color: 'var(--accent)' }}>GOLD FIBRA</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Sistema de Gestão Empresarial</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Entrar no Sistema</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">ID de Acesso</label>
              <div className="flex">
                <span className="flex items-center px-4 rounded-l-lg text-sm font-black border-y border-l h-[42px]"
                  style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>JD</span>
                <input
                  type="text" value={nums}
                  onChange={e => setNums(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="input rounded-l-none border-l-0 font-mono tracking-widest h-[42px]"
                  autoComplete="username"
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                ID completo: <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{nums ? 'JD' + nums : 'JD______'}</span>
              </p>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="input pr-10 h-[42px]"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              <LogIn className="w-5 h-5" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Acesso restrito a colaboradores autorizados</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>JD TELECOM - GOLD FIBRA © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
