import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TABS = ['Dados Gerais', 'MikroTik', 'OLT', 'Rede'];

const EMPTY = {
  nome: '', tipo_auth: 'pppoe',
  ip_servidor: '', porta: 8728, tipo_integracao: 'api',
  usuario: '', senha: '', token: '',
  vlan: '', perfil_velocidade: '', pool_ip: '',
  tipo_olt: 'nenhuma', ip_olt: '', porta_olt: 23, usuario_olt: '', senha_olt: '',
};

function Badge({ ok }) {
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: ok ? '#10b981' : '#ef4444', marginRight: 6 }} />;
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', background: '#f8fafc', color: '#1e293b' };
const sel = { ...inp, cursor: 'pointer' };

export default function Providers() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState({});
  const [testing, setTesting] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Acesso exclusivo ao ID=1
  if (user?.id !== 1) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center', color: '#ef4444' }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Acesso Restrito</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Somente o Administrador Master pode acessar este módulo.</div>
        </div>
      </div>
    );
  }

  function load() {
    setLoading(true);
    api.get('/providers').then(r => setProviders(r.data || [])).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() { setForm(EMPTY); setEditId(null); setTab(0); setTestResult({}); setShowForm(true); }

  async function openEdit(p) {
    // Buscar dados completos (com senhas descriptografadas)
    const r = await api.get(`/providers/${p.id}`);
    setForm({ ...EMPTY, ...r.data });
    setEditId(p.id);
    setTab(0);
    setTestResult({});
    setShowForm(true);
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.nome) return alert('Nome do provedor é obrigatório.');
    setSaving(true);
    try {
      if (editId) { await api.put(`/providers/${editId}`, form); }
      else { await api.post('/providers', form); }
      setShowForm(false);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar');
    }
    setSaving(false);
  }

  async function testConn(tipo) {
    if (!editId) return alert('Salve o provedor antes de testar a conexão.');
    setTesting(tipo);
    try {
      const r = await api.post(`/providers/${editId}/test`, { tipo });
      const ok = r.data.results[0]?.ok;
      const msg = r.data.results[0]?.msg;
      setTestResult(t => ({ ...t, [tipo]: { ok, msg } }));
    } catch (e) {
      setTestResult(t => ({ ...t, [tipo]: { ok: false, msg: e.response?.data?.error || 'Erro' } }));
    }
    setTesting('');
  }

  async function deactivate(id) {
    await api.delete(`/providers/${id}`);
    setDeleteConfirm(null);
    load();
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>🔐 Cadastro de Provedor</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>CORE do sistema — Configuração de servidores e integrações</p>
        </div>
        <button onClick={openNew} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
          + Novo Provedor
        </button>
      </div>

      {/* Lista */}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Carregando...</div>}

      {!loading && providers.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 48, textAlign: 'center', border: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: 48 }}>📡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#334155', marginTop: 12 }}>Nenhum provedor cadastrado</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Cadastre o primeiro provedor para começar a provisionar clientes.</div>
          <button onClick={openNew} style={{ marginTop: 20, background: '#6366f1', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            Cadastrar Provedor
          </button>
        </div>
      )}

      {providers.map(p => (
        <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, border: '1.5px solid #e2e8f0' }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>{p.nome}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Auth: <b>{p.tipo_auth?.toUpperCase()}</b> &nbsp;|&nbsp; OLT: <b>{p.tipo_olt?.toUpperCase()}</b>
            </div>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Servidor</div>
            <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{p.ip_servidor || '—'} : {p.porta || 8728}</div>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Integração</div>
            <div style={{ fontWeight: 600, color: '#7c3aed', fontSize: 13, textTransform: 'uppercase' }}>{p.tipo_integracao || 'API'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openEdit(p)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              ✏️ Editar
            </button>
            <button onClick={() => setDeleteConfirm(p)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              🗑
            </button>
          </div>
        </div>
      ))}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>Desativar Provedor?</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>O provedor <b>{deleteConfirm.nome}</b> será desativado. Os dados salvos não serão apagados.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}>Cancelar</button>
              <button onClick={() => deactivate(deleteConfirm.id)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Desativar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, marginTop: 20, marginBottom: 20 }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '18px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{editId ? '✏️ Editar Provedor' : '+ Novo Provedor'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
              {TABS.map((t, i) => (
                <button key={i} onClick={() => setTab(i)}
                  style={{ flex: 1, padding: '12px 8px', border: 'none', background: 'none', fontWeight: tab === i ? 800 : 500, color: tab === i ? '#6366f1' : '#94a3b8', borderBottom: tab === i ? '3px solid #6366f1' : '3px solid transparent', cursor: 'pointer', fontSize: 13 }}>
                  {t}
                </button>
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {/* Tab 0: Dados Gerais */}
              {tab === 0 && (
                <>
                  <Field label="Nome do Provedor" required>
                    <input style={inp} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: SysFlowCloudi" />
                  </Field>
                  <Field label="Tipo de Autenticação">
                    <select style={sel} value={form.tipo_auth} onChange={e => set('tipo_auth', e.target.value)}>
                      <option value="pppoe">PPPoE</option>
                      <option value="dhcp">DHCP</option>
                    </select>
                  </Field>
                  <Field label="Tipo de Integração">
                    <select style={sel} value={form.tipo_integracao} onChange={e => set('tipo_integracao', e.target.value)}>
                      <option value="api">API (RouterOS)</option>
                      <option value="ssh">SSH</option>
                      <option value="simulado">Simulado (sem servidor real)</option>
                    </select>
                  </Field>
                </>
              )}

              {/* Tab 1: MikroTik */}
              {tab === 1 && (
                <>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
                    ⚙️ Configurações do servidor MikroTik RouterOS (PPPoE)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                    <Field label="IP do Servidor">
                      <input style={inp} value={form.ip_servidor} onChange={e => set('ip_servidor', e.target.value)} placeholder="192.168.1.1" />
                    </Field>
                    <Field label="Porta API">
                      <input style={{ ...inp, width: 90 }} type="number" value={form.porta} onChange={e => set('porta', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Usuário do Servidor">
                    <input style={inp} value={form.usuario} onChange={e => set('usuario', e.target.value)} placeholder="admin" />
                  </Field>
                  <Field label="Senha do Servidor">
                    <input style={inp} type="password" value={form.senha} onChange={e => set('senha', e.target.value)} placeholder="••••••••" />
                  </Field>
                  <Field label="Token / API Key (opcional)">
                    <input style={inp} value={form.token} onChange={e => set('token', e.target.value)} placeholder="Token de acesso à API" />
                  </Field>
                  {testResult.mikrotik && (
                    <div style={{ background: testResult.mikrotik.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.mikrotik.ok ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                      <Badge ok={testResult.mikrotik.ok} />{testResult.mikrotik.msg}
                    </div>
                  )}
                  <button onClick={() => testConn('mikrotik')} disabled={testing === 'mikrotik'}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #6366f1', background: '#fff', color: '#6366f1', fontWeight: 700, cursor: 'pointer' }}>
                    {testing === 'mikrotik' ? '⏳ Testando...' : '🔌 Testar Conexão MikroTik'}
                  </button>
                </>
              )}

              {/* Tab 2: OLT */}
              {tab === 2 && (
                <>
                  <Field label="Tipo de OLT">
                    <select style={sel} value={form.tipo_olt} onChange={e => set('tipo_olt', e.target.value)}>
                      <option value="nenhuma">Sem OLT (não usar)</option>
                      <option value="huawei">Huawei</option>
                      <option value="zte">ZTE</option>
                      <option value="datacom">Datacom</option>
                    </select>
                  </Field>
                  {form.tipo_olt !== 'nenhuma' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                        <Field label="IP da OLT">
                          <input style={inp} value={form.ip_olt} onChange={e => set('ip_olt', e.target.value)} placeholder="10.0.0.1" />
                        </Field>
                        <Field label="Porta">
                          <input style={{ ...inp, width: 90 }} type="number" value={form.porta_olt} onChange={e => set('porta_olt', e.target.value)} />
                        </Field>
                      </div>
                      <Field label="Usuário OLT">
                        <input style={inp} value={form.usuario_olt} onChange={e => set('usuario_olt', e.target.value)} placeholder="admin" />
                      </Field>
                      <Field label="Senha OLT">
                        <input style={inp} type="password" value={form.senha_olt} onChange={e => set('senha_olt', e.target.value)} placeholder="••••••••" />
                      </Field>
                      {testResult.olt && (
                        <div style={{ background: testResult.olt.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.olt.ok ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                          <Badge ok={testResult.olt.ok} />{testResult.olt.msg}
                        </div>
                      )}
                      <button onClick={() => testConn('olt')} disabled={testing === 'olt'}
                        style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #10b981', background: '#fff', color: '#059669', fontWeight: 700, cursor: 'pointer' }}>
                        {testing === 'olt' ? '⏳ Testando...' : '🔌 Testar Conexão OLT'}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Tab 3: Rede */}
              {tab === 3 && (
                <>
                  <Field label="VLAN Padrão">
                    <input style={inp} value={form.vlan} onChange={e => set('vlan', e.target.value)} placeholder="Ex: 100" />
                  </Field>
                  <Field label="Perfil de Velocidade">
                    <input style={inp} value={form.perfil_velocidade} onChange={e => set('perfil_velocidade', e.target.value)} placeholder="Ex: 100M, 200M, 500M" />
                  </Field>
                  <Field label="Pool de IP">
                    <input style={inp} value={form.pool_ip} onChange={e => set('pool_ip', e.target.value)} placeholder="Ex: 10.10.0.0/24" />
                  </Field>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '11px 24px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
                {saving ? 'Salvando...' : editId ? '✔ Salvar Alterações' : '✔ Cadastrar Provedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
