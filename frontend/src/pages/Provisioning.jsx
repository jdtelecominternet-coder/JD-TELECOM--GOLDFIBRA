import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STEPS = [
  { id: 1, label: 'Conectando ao servidor...' },
  { id: 2, label: 'Autenticando credenciais...' },
  { id: 3, label: 'Criando perfil PPPoE...' },
  { id: 4, label: 'Liberando ONU na OLT...' },
  { id: 5, label: 'Configurando VLAN...' },
  { id: 6, label: 'Atribuindo IP do pool...' },
  { id: 7, label: 'Cliente ativo! Internet disponível.' },
];

function gerarSenha() {
  const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

export default function Provisioning() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('form'); // 'form' | 'progress' | 'success' | 'history'

  const [form, setForm] = useState({
    provider_id: '', client_id: '',
    login_pppoe: '', senha_pppoe: '',
    plano: '', mac_onu: '', serial_onu: '',
  });
  const [providerSel, setProviderSel] = useState(null);
  const [activating, setActivating] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/providers').then(r => setProviders(r.data || []));
    api.get('/clients').then(r => setClients(r.data || []));
    api.get('/provisioning').then(r => setHistory(r.data || []));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function onProviderChange(id) {
    set('provider_id', id);
    const p = providers.find(x => String(x.id) === String(id));
    setProviderSel(p || null);
    if (p?.perfil_velocidade) set('plano', p.perfil_velocidade.split(',')[0]?.trim() || '');
  }

  function onClientChange(id) {
    set('client_id', id);
    // Auto-preencher login baseado no nome do cliente
    const c = clients.find(x => String(x.id) === String(id));
    if (c && !form.login_pppoe) {
      const loginAuto = c.name?.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').substring(0, 20) || '';
      set('login_pppoe', loginAuto);
    }
  }

  async function activate() {
    if (!form.provider_id) return setError('Selecione um provedor.');
    if (!form.login_pppoe) return setError('Login PPPoE é obrigatório.');
    setError('');
    setView('progress');
    setProgressLogs([]);
    setActivating(true);

    // Simular progresso visual enquanto espera o backend
    let stepIdx = 0;
    const maxSteps = providerSel?.tipo_olt !== 'nenhuma' ? STEPS.length : STEPS.filter(s => s.id !== 4).length;
    const iv = setInterval(() => {
      if (stepIdx < maxSteps - 1) {
        setProgressLogs(l => [...l, { step: stepIdx + 1, status: 'ok' }]);
        stepIdx++;
      }
    }, 600);

    try {
      const senha = form.senha_pppoe || gerarSenha();
      const r = await api.post('/provisioning/activate', { ...form, senha_pppoe: senha });
      clearInterval(iv);
      setProgressLogs(STEPS.map((s, i) => ({ step: i + 1, status: 'ok' })));
      setResult({ ...r.data, senha_pppoe: senha });
      setView('success');
      api.get('/provisioning').then(r2 => setHistory(r2.data || []));
    } catch (e) {
      clearInterval(iv);
      setError(e.response?.data?.error || 'Erro no provisionamento.');
      setView('form');
    }
    setActivating(false);
  }

  async function deactivate(id) {
    if (!window.confirm('Desativar este cliente?')) return;
    await api.post('/provisioning/deactivate', { provisioning_id: id });
    api.get('/provisioning').then(r => setHistory(r.data || []));
  }

  const statusColor = { ativo: '#10b981', pendente: '#f59e0b', erro: '#ef4444', desativado: '#94a3b8' };
  const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', background: '#f8fafc', color: '#1e293b' };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#065f46,#047857)', borderRadius: 14, padding: '18px 22px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>⚡ Habilitar Cliente</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Provisionamento automático — PPPoE + ONU</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('form')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: view === 'form' ? '#fff' : 'rgba(255,255,255,0.2)', color: view === 'form' ? '#065f46' : '#fff', fontWeight: 700, cursor: 'pointer' }}>
            ⚡ Ativar
          </button>
          <button onClick={() => setView('history')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: view === 'history' ? '#fff' : 'rgba(255,255,255,0.2)', color: view === 'history' ? '#065f46' : '#fff', fontWeight: 700, cursor: 'pointer' }}>
            📋 Histórico
          </button>
        </div>
      </div>

      {/* ── FORMULÁRIO ── */}
      {view === 'form' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Provedor */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>
              🌐 Provedor <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select style={inp} value={form.provider_id} onChange={e => onProviderChange(e.target.value)}>
              <option value="">Selecione o provedor...</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.nome} — {p.tipo_auth?.toUpperCase()}</option>)}
            </select>
          </div>

          {/* Info do provedor selecionado */}
          {providerSel && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div><span style={{ fontSize: 11, color: '#64748b' }}>Servidor</span><div style={{ fontWeight: 700, color: '#065f46', fontSize: 13 }}>{providerSel.ip_servidor || 'Simulado'}</div></div>
              <div><span style={{ fontSize: 11, color: '#64748b' }}>Integração</span><div style={{ fontWeight: 700, color: '#065f46', fontSize: 13, textTransform: 'uppercase' }}>{providerSel.tipo_integracao}</div></div>
              <div><span style={{ fontSize: 11, color: '#64748b' }}>OLT</span><div style={{ fontWeight: 700, color: '#065f46', fontSize: 13, textTransform: 'uppercase' }}>{providerSel.tipo_olt || 'Nenhuma'}</div></div>
              {providerSel.vlan && <div><span style={{ fontSize: 11, color: '#64748b' }}>VLAN</span><div style={{ fontWeight: 700, color: '#065f46', fontSize: 13 }}>{providerSel.vlan}</div></div>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {/* Cliente */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>👤 Cliente (opcional)</label>
              <select style={inp} value={form.client_id} onChange={e => onClientChange(e.target.value)}>
                <option value="">Selecionar cliente cadastrado...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.cpf || c.whatsapp || ''}</option>)}
              </select>
            </div>

            {/* Login PPPoE */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>Login PPPoE <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inp} value={form.login_pppoe} onChange={e => set('login_pppoe', e.target.value)} placeholder="cliente@jdtelecom" />
            </div>

            {/* Senha PPPoE */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>Senha PPPoE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inp, flex: 1 }} value={form.senha_pppoe} onChange={e => set('senha_pppoe', e.target.value)} placeholder="Deixe vazio para gerar automático" />
                <button onClick={() => set('senha_pppoe', gerarSenha())} title="Gerar senha" style={{ padding: '0 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 18 }}>🎲</button>
              </div>
            </div>

            {/* Plano */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>📶 Plano / Velocidade</label>
              <input style={inp} value={form.plano} onChange={e => set('plano', e.target.value)} placeholder="Ex: 100M, 200M, 1G" />
            </div>

            {/* MAC */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>🔌 MAC da ONU</label>
              <input style={inp} value={form.mac_onu} onChange={e => set('mac_onu', e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
            </div>

            {/* Serial ONU */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>📟 Serial da ONU {providerSel?.tipo_olt !== 'nenhuma' && <span style={{ color: '#f59e0b' }}>(necessário para liberar na OLT)</span>}</label>
              <input style={inp} value={form.serial_onu} onChange={e => set('serial_onu', e.target.value)} placeholder="Ex: HWTC1A2B3C4D" />
            </div>
          </div>

          <button onClick={activate} disabled={!form.provider_id || !form.login_pppoe}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              background: form.provider_id && form.login_pppoe ? 'linear-gradient(135deg,#065f46,#047857)' : '#e2e8f0',
              color: form.provider_id && form.login_pppoe ? '#fff' : '#94a3b8',
              fontWeight: 800, cursor: 'pointer', fontSize: 16, letterSpacing: 0.5 }}>
            ⚡ ATIVAR CLIENTE
          </button>
        </div>
      )}

      {/* ── PROGRESSO ── */}
      {view === 'progress' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 36, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Provisionando cliente...</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>Aguarde, configurando o servidor automaticamente</div>
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
            {STEPS.map((s, i) => {
              const done = progressLogs.some(l => l.step === s.id);
              const active = progressLogs.length === i;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 6, background: done ? '#f0fdf4' : active ? '#eff6ff' : '#f8fafc', border: `1px solid ${done ? '#86efac' : active ? '#bfdbfe' : '#e2e8f0'}` }}>
                  <span style={{ fontSize: 18 }}>{done ? '✅' : active ? '⏳' : '⬜'}</span>
                  <span style={{ fontSize: 13, fontWeight: done ? 700 : 400, color: done ? '#065f46' : '#64748b' }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUCESSO ── */}
      {view === 'success' && result && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 36, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#065f46', marginBottom: 6 }}>Cliente Ativado com Sucesso!</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 28 }}>Internet já disponível para o cliente</div>

          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: 20, maxWidth: 380, margin: '0 auto', textAlign: 'left', marginBottom: 24 }}>
            <div style={{ fontWeight: 800, color: '#065f46', marginBottom: 14, fontSize: 15 }}>📋 Dados de Acesso</div>
            {[
              ['Login PPPoE', result.login_pppoe],
              ['Senha PPPoE', result.senha_pppoe],
              ['Provedor', providerSel?.nome],
              ['Plano', form.plano || '—'],
            ].map(([k, v]) => v && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #dcfce7' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => { setForm({ provider_id: '', client_id: '', login_pppoe: '', senha_pppoe: '', plano: '', mac_onu: '', serial_onu: '' }); setView('form'); setResult(null); }}
              style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#065f46,#047857)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
              ⚡ Ativar Outro Cliente
            </button>
            <button onClick={() => setView('history')} style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>
              📋 Ver Histórico
            </button>
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {view === 'history' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b', marginBottom: 16 }}>📋 Histórico de Provisionamentos</div>
          {history.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>Nenhum provisionamento realizado ainda.</div>}
          {history.map(h => (
            <div key={h.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor[h.status] || '#94a3b8', flexShrink: 0 }} />
              <div style={{ flex: '1 1 150px' }}>
                <div style={{ fontWeight: 800, fontSize: 14, fontFamily: 'monospace', color: '#1e293b' }}>{h.login_pppoe}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{h.client_name || 'Cliente avulso'}</div>
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Provedor</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{h.provider_nome}</div>
              </div>
              <div style={{ flex: '1 1 90px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Plano</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.plano || '—'}</div>
              </div>
              <div style={{ padding: '4px 12px', borderRadius: 20, background: `${statusColor[h.status]}20`, color: statusColor[h.status], fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>
                {h.status}
              </div>
              {h.status === 'ativo' && user?.role === 'admin' && (
                <button onClick={() => deactivate(h.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                  Desativar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
