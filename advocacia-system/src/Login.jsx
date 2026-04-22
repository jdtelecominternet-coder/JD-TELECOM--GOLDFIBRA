import { useState } from 'react';
import { login } from './store';
import { Scale, Lock, Eye, EyeOff, Shield, Hash } from 'lucide-react';

export default function Login({ onLogin }) {
  const [loginCode, setLoginCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const user = login(loginCode, password);
    if (user) { onLogin(user); }
    else { setError('Código de acesso ou senha inválidos.'); }
  }

  // Formata automaticamente em maiúsculo
  function handleCodeChange(e) {
    setLoginCode(e.target.value.toUpperCase());
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

      <div className="animate-fadeIn" style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light))', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(201,168,76,0.25)' }}>
            <Scale size={40} color="#0A0A0A" strokeWidth={1.5} />
          </div>
          <h1 className="font-cinzel gold-text" style={{ fontSize: '30px', letterSpacing: '0.12em', marginBottom: '8px' }}>ADVOCACIA</h1>
          <p style={{ color: 'var(--white-dim)', fontSize: '12px', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Sistema de Gestão Jurídica</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <Shield size={16} color="var(--gold)" />
            <h2 className="font-cinzel" style={{ color: 'var(--white)', fontSize: '14px', letterSpacing: '0.06em' }}>ACESSO AO SISTEMA</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Código de login */}
            <div>
              <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>
                Código de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                {/* Prefixo visual */}
                <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', display: 'flex', alignItems: 'center', paddingLeft: '12px', pointerEvents: 'none' }}>
                  <Hash size={14} color="var(--gold-dark)" />
                </div>
                <input
                  className="input-dark"
                  style={{
                    paddingLeft: '36px',
                    fontFamily: 'Cinzel, serif',
                    fontSize: '18px',
                    fontWeight: '600',
                    letterSpacing: '0.2em',
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    caretColor: 'var(--gold)',
                  }}
                  type="text"
                  placeholder="AD001"
                  value={loginCode}
                  onChange={handleCodeChange}
                  maxLength={10}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              <p style={{ color: 'var(--white-dim)', fontSize: '11px', marginTop: '5px' }}>
                Código fornecido pelo escritório • Ex: <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>AD001</span> ou <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>CL001</span>
              </p>
            </div>

            {/* Senha */}
            <div>
              <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-dark)' }} />
                <input
                  className="input-dark"
                  style={{ paddingLeft: '38px', paddingRight: '44px' }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ color: '#E74C3C', fontSize: '13px', background: 'rgba(231,76,60,0.1)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(231,76,60,0.25)' }}>
                {error}
              </div>
            )}

            <button className="btn-gold" type="submit" style={{ padding: '13px', borderRadius: '8px', fontSize: '14px', marginTop: '4px', letterSpacing: '0.1em' }}>
              ENTRAR
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--white-dim)', fontSize: '11px', marginTop: '20px', letterSpacing: '0.05em' }}>
          Acesso exclusivo — cadastro realizado internamente pelo escritório
        </p>
      </div>
    </div>
  );
}
