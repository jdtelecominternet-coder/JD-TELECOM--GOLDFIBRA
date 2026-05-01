import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { Wifi, Eye, EyeOff, LogIn, Sun, Moon, Fingerprint } from 'lucide-react';
import api from '../services/api';

// ---------- helpers WebAuthn ----------
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function supportsWebAuthn() {
  return window.PublicKeyCredential !== undefined;
}
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

export default function Login() {
  const { login, loginWithToken } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [nums, setNums] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [hasBio, setHasBio] = useState(false);    // dispositivo suporta
  const [bioSaved, setBioSaved] = useState(false); // usuário já registrou
  const [showPass, setShowPass] = useState(true);  // mostrar form senha
  const mobile = isMobile();

  useEffect(() => {
    if (!mobile || !supportsWebAuthn()) return;
    setHasBio(true);
    // Verifica se há credencial salva para este dispositivo
    const cred = localStorage.getItem('jd_bio_cred');
    if (cred) setBioSaved(true);
  }, []);

  // ---------- LOGIN COM SENHA ----------
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

  // ---------- LOGIN COM BIOMETRIA ----------
  async function handleBioLogin() {
    if (!hasBio) return;
    setBioLoading(true);
    try {
      // 1. Busca challenge do servidor
      const { data } = await api.post('/auth/webauthn/challenge', {});
      const challenge = fromB64url(data.challenge);

      // 2. Recupera credencial salva
      const savedCredId = localStorage.getItem('jd_bio_cred');
      if (!savedCredId) {
        toast.error('Nenhuma biometria registrada. Use sua senha.');
        setBioLoading(false);
        setShowPass(true);
        return;
      }

      // 3. Solicita autenticação biométrica ao dispositivo
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          allowCredentials: [{ id: fromB64url(savedCredId), type: 'public-key' }],
          userVerification: 'required',
        }
      });

      // 4. Envia para o servidor verificar
      const { data: result } = await api.post('/auth/webauthn/login', {
        credentialId: b64url(assertion.rawId),
        clientDataJSON: b64url(assertion.response.clientDataJSON),
        authenticatorData: b64url(assertion.response.authenticatorData),
        signature: b64url(assertion.response.signature),
      });

      // 5. Login bem-sucedido — atualiza contexto imediatamente
      loginWithToken(result.token, result.user);
      toast.success('✅ Autenticação realizada com sucesso!');
      nav('/', { replace: true });
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        toast.error('❌ Biometria cancelada. Use sua senha.');
      } else {
        toast.error(err.response?.data?.error || '❌ Não foi possível validar biometria. Use sua senha.');
      }
      setShowPass(true);
    } finally { setBioLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-main)' }}>
      {/* Theme toggle */}
      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

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
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>SysFlowCloudi</h1>
          <p className="text-sm mt-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Sistema de Gestão Empresarial</p>
        </div>

        <div className="card p-8 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Entrar no Sistema</h2>

          {/* BOTÃO BIOMETRIA — só aparece no celular/tablet com biometria registrada */}
          {mobile && hasBio && bioSaved && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={handleBioLogin}
                disabled={bioLoading}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14,
                  background: bioLoading ? 'var(--bg-input)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
                  border: '1.5px solid #3b82f6', color: '#fff',
                  fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.3)'
                }}>
                <span style={{ fontSize: 28 }}>👆</span>
                {bioLoading ? 'Verificando biometria...' : 'Entrar com Digital / Face ID'}
              </button>
              <div style={{ textAlign: 'center', margin: '14px 0 4px', color: 'var(--text-muted)', fontSize: 12 }}>
                — ou use sua senha —
              </div>
            </div>
          )}

          {/* BOTÃO BIOMETRIA — celular com suporte mas sem registro ainda */}
          {mobile && hasBio && !bioSaved && (
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              👆 Faça login com senha e ative a biometria no seu perfil
            </div>
          )}

          {/* FORM SENHA */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">ID de Acesso</label>
              <div className="flex">
                <span className="flex items-center px-4 rounded-l-lg text-sm font-black border-y border-l h-[42px]"
                  style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>ID</span>
                <input type="text" value={nums}
                  onChange={e => setNums(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="input rounded-l-none border-l-0 font-mono tracking-widest h-[42px]"
                  autoComplete="username" />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="input pr-10 h-[42px]"
                  autoComplete="current-password" />
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
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Acesso restrito a colaboradores autorizados</p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>SysFlowCloudi © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
