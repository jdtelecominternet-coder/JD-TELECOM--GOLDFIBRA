import { useState } from 'react';
import { getMaster, getUsers, getClients, getStats } from './store';
import { Crown, Shield, Users, FolderOpen, DollarSign, Settings, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function MasterPanel({ user }) {
  const master = getMaster();
  const users = getUsers();
  const clients = getClients();
  const stats = getStats();
  const [tab, setTab] = useState('visao');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Senhas ficam em localStorage separado para o master
  function saveMasterPassword() {
    if (!newPassword || newPassword.length < 6) { setSavedMsg('error:Senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setSavedMsg('error:As senhas não coincidem.'); return; }
    localStorage.setItem('adv_master_password', newPassword);
    setSavedMsg('ok:Senha alterada com sucesso!');
    setNewPassword(''); setConfirmPassword('');
    setTimeout(() => setSavedMsg(''), 3000);
  }

  const TABS = [
    { id: 'visao', label: 'Visão Geral', icon: Crown },
    { id: 'seguranca', label: 'Segurança', icon: Key },
    { id: 'usuarios', label: 'Usuários do Sistema', icon: Users },
  ];

  const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <div className="animate-fadeIn">
      {/* Banner master */}
      <div style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1400 50%, #0A0A0A 100%)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '24px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 100% at 0% 50%, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-light))', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}>
          <Crown size={28} color="#0A0A0A" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 className="font-cinzel gold-text" style={{ fontSize: '20px', letterSpacing: '0.08em' }}>ADMINISTRADOR MASTER</h1>
            <span style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: 'var(--gold)', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>ACESSO TOTAL</span>
          </div>
          <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>Controle completo do sistema. Usuário: <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>master</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.1)', marginBottom: '24px' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: tab === t.id ? 'var(--gold)' : 'var(--white-dim)', borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── VISÃO GERAL ── */}
      {tab === 'visao' && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Processos', value: stats.total, sub: `${stats.andamento} em andamento`, icon: FolderOpen, color: 'var(--gold)' },
              { label: 'Clientes', value: clients.length, sub: 'cadastrados', icon: Users, color: '#27AE60' },
              { label: 'Usuários Internos', value: users.length, sub: 'advogados e assistentes', icon: Shield, color: '#2980B9' },
              { label: 'Honorários a Receber', value: fmt(stats.aReceber), sub: 'valor pendente', icon: DollarSign, color: 'var(--gold)' },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="card" style={{ padding: '20px' }}>
                  <div style={{ width: '38px', height: '38px', background: `${c.color}18`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <Icon size={18} color={c.color} />
                  </div>
                  <div style={{ color: 'var(--white)', fontSize: '22px', fontWeight: '700', fontFamily: 'Cinzel, serif' }}>{c.value}</div>
                  <div style={{ color: c.color, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '3px 0' }}>{c.label}</div>
                  <div style={{ color: 'var(--white-dim)', fontSize: '11px' }}>{c.sub}</div>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '16px' }}>PRIVILÉGIOS DO MASTER</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {[
                'Acesso irrestrito a todos os módulos',
                'Criar, editar e excluir qualquer usuário',
                'Visualizar dados de todos os clientes',
                'Alterar configurações do sistema',
                'Conta não pode ser deletada',
                'Senha gerenciada de forma independente',
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(201,168,76,0.05)', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.1)' }}>
                  <CheckCircle size={14} color="var(--gold)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SEGURANÇA ── */}
      {tab === 'seguranca' && (
        <div className="animate-fadeIn">
          <div className="card" style={{ padding: '28px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Key size={18} color="var(--gold)" />
              <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '14px', letterSpacing: '0.08em' }}>ALTERAR SENHA MASTER</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-dark" type={showPass ? 'text' : 'password'} placeholder="mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ paddingRight: '40px' }} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Confirmar Nova Senha</label>
                <input className="input-dark" type={showPass ? 'text' : 'password'} placeholder="repita a senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>

              {savedMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '13px', background: savedMsg.startsWith('ok') ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)', border: `1px solid ${savedMsg.startsWith('ok') ? 'rgba(39,174,96,0.25)' : 'rgba(231,76,60,0.25)'}`, color: savedMsg.startsWith('ok') ? '#27AE60' : '#E74C3C' }}>
                  {savedMsg.split(':')[1]}
                </div>
              )}

              <button className="btn-gold" onClick={saveMasterPassword} style={{ padding: '12px', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }}>
                Salvar Nova Senha
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(201,168,76,0.05)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.1)' }}>
              <p style={{ color: 'var(--white-dim)', fontSize: '11px', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--gold)' }}>Usuário master:</span> <span style={{ fontFamily: 'monospace' }}>master</span><br />
                A senha é armazenada localmente. Guarde em local seguro.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── USUÁRIOS DO SISTEMA ── */}
      {tab === 'usuarios' && (
        <div className="animate-fadeIn">
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '16px' }}>TODOS OS USUÁRIOS INTERNOS</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-dark">
              <thead>
                <tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>OAB</th></tr>
              </thead>
              <tbody>
                {/* Master sempre no topo */}
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Crown size={13} color="var(--gold)" />
                      <span style={{ color: 'var(--gold)', fontWeight: '600' }}>Administrador Master</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>master</td>
                  <td><span style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>MASTER</span></td>
                  <td style={{ color: 'var(--white-dim)' }}>—</td>
                </tr>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--white)' }}>{u.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{u.username}</td>
                    <td>
                      <span style={{ background: u.role === 'admin' ? 'rgba(201,168,76,0.1)' : u.role === 'advogado' ? 'rgba(39,174,96,0.1)' : 'rgba(41,128,185,0.1)', color: u.role === 'admin' ? 'var(--gold)' : u.role === 'advogado' ? '#27AE60' : '#2980B9', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td style={{ color: 'var(--white-dim)' }}>{u.oab || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
