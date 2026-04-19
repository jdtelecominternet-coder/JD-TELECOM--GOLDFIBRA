import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Eye, EyeOff, Shield, ShoppingBag, Wrench, UserX, CheckCircle, XCircle, Settings2, Globe, RotateCcw, Network } from 'lucide-react';
import AdminDeleteModal from '../components/AdminDeleteModal';

const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Técnico', manutencao: 'Técnico de Rede' };
const roleIcon  = { admin: Shield, vendedor: ShoppingBag, tecnico: Wrench, manutencao: Network };

// Permissões padrão por role
const defaultPerms = {
  admin:      { clients: true, plans: true, orders: true, technical: true, reports: true, chat: true, gerar_link: true },
  vendedor:   { clients: true, plans: true, orders: true, technical: false, reports: false, chat: false, gerar_link: true },
  tecnico:    { clients: false, plans: true, orders: false, technical: true, reports: false, chat: true, gerar_link: false },
  manutencao: { clients: false, plans: false, orders: false, technical: false, reports: false, chat: true, gerar_link: false, servico_rede: true },
};
const PERM_LABELS = [
  { key: 'clients',      label: 'Clientes',              icon: '👥' },
  { key: 'plans',        label: 'Planos',                 icon: '📦' },
  { key: 'orders',       label: 'Ordens de Serviço',      icon: '📋' },
  { key: 'technical',    label: 'Módulo Técnico',          icon: '🛠️' },
  { key: 'servico_rede', label: 'Módulo Serviço de Rede',  icon: '🌐' },
  { key: 'reports',      label: 'Relatórios',              icon: '📊' },
  { key: 'chat',         label: 'Chat Interno',            icon: '💬' },
  { key: 'gerar_link',   label: 'Gerar Link de Cadastro',  icon: '🔗' },
];

const GLOBAL_PERM_LABELS = {
  default: [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'users', label: 'Gerenciar Usuarios', icon: '👥' },
    { key: 'clients', label: 'Clientes', icon: '🤝' },
    { key: 'plans', label: 'Planos', icon: '📦' },
    { key: 'orders', label: 'Ordens de Servico', icon: '📋' },
    { key: 'transfer', label: 'Transferir OS', icon: '🔄' },
    { key: 'technical', label: 'Modulo Tecnico', icon: '🛠️' },
    { key: 'reports', label: 'Relatorios', icon: '📈' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'settings', label: 'Configuracoes', icon: '⚙️' },
  ],
  manutencao: [
    { key: 'servico_rede', label: 'Modulo Serv. de Rede', icon: '🌐' },
    { key: 'chat',         label: 'Chat',                 icon: '💬' },
    { key: 'reports',      label: 'Relatorios',           icon: '📈' },
    { key: 'settings',     label: 'Configuracoes',        icon: '⚙️' },
  ],
};
export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [permModal, setPermModal] = useState(null); // user object
  const [permForm, setPermForm] = useState({});
  const [form, setForm] = useState({ name: '', role: 'vendedor', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalPermsTab, setGlobalPermsTab] = useState("vendedor");
  const [globalPerms, setGlobalPerms] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { id, name, jd_id }
  const [savingGlobal, setSavingGlobal] = useState(false);

  async function load() {
    try { const r = await api.get('/users'); setUsers(r.data); } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { api.get("/settings/role-permissions").then(r => setGlobalPerms(r.data)).catch(() => {}); }, []);
  async function saveGlobalPerms(role) { setSavingGlobal(true); try { await api.put("/settings/role-permissions", { role, permissions: globalPerms[role] }); toast.success("Permissoes salvas!"); } catch { toast.error("Erro"); } finally { setSavingGlobal(false); } }
  function toggleGlobalPerm(role, key) { setGlobalPerms(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } })); }

  async function save() {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    setSaving(true);
    try {
      if (modal === 'create') {
        const r = await api.post('/users', form);
        toast.success(`Usuário criado! ID: ${r.data.jd_id} | Senha: ${form.password || 'jd1234'}`);
      } else {
        await api.put(`/users/${modal.id}`, { name: form.name, role: form.role, active: form.active, ...(form.password ? { password: form.password } : {}) });
        toast.success(form.password ? 'Usuário atualizado e senha redefinida!' : 'Atualizado!');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro');
    } finally { setSaving(false); }
  }

  async function toggleActive(u) {
    try {
      await api.put(`/users/${u.id}`, { active: u.active ? 0 : 1 });
      toast.success(u.active ? 'Usuário desativado' : 'Usuário ativado');
      load();
    } catch { toast.error('Erro'); }
  }

  async function resetTechOS(u) {
    if (!window.confirm(`Zerar TODAS as ordens de serviço e valores de "${u.name}"?\n\nIsso apaga o histórico de OS e ganhos do técnico.\nEsta ação não pode ser desfeita.`)) return;
    try {
      const r = await api.delete(`/users/${u.id}/reset-os`);
      toast.success(r.data.message);
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao zerar OS'); }
  }

  async function deleteUser(u) {
    try {
      await api.delete(`/users/${u.id}`);
      toast.success(`${u.name} excluído!`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao excluir'); }
  }

  function openPerms(u) {
    const base = defaultPerms[u.role] || {};
    const custom = u.permissions || {};
    setPermForm({ ...base, ...custom });
    setPermModal(u);
  }

  async function savePermissions() {
    setSaving(true);
    try {
      await api.put(`/users/${permModal.id}/permissions`, { permissions: permForm });
      toast.success('Permissões atualizadas!');
      setPermModal(null);
      load();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.jd_id.includes(search);
    const matchRole   = filterRole   ? u.role === filterRole : true;
    const matchStatus = filterStatus !== '' ? String(u.active) === filterStatus : true;
    return matchSearch && matchRole && matchStatus;
  });

  function openCreate() {
    setForm({ name: '', role: 'vendedor', password: '' });
    setShowPw(false);
    setModal('create');
  }
  function openEdit(u) {
    setForm({ name: u.name, role: u.role, password: '', active: u.active });
    setShowPw(false);
    setModal(u);
  }

  return (
    <div className="space-y-5">
      {globalPerms && (
        <div className="card p-5 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5" style={{color:"var(--accent)"}} />
            <div>
              <h2 className="font-black text-base" style={{color:"var(--text-primary)"}}>Permissoes Globais por Funcao</h2>
              <p className="text-xs" style={{color:"var(--text-muted)"}}>Aplica automaticamente a todos os usuarios do cargo</p>
            </div>
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {["vendedor","tecnico","manutencao"].map(r=>(
              <button key={r} onClick={()=>setGlobalPermsTab(r)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${globalPermsTab===r?"bg-blue-600 text-white":"opacity-60"}`} style={globalPermsTab!==r?{background:"var(--bg-main)",color:"var(--text-secondary)",border:"1px solid var(--border)"}:{}}>
                {r==="vendedor"?"Vendedor": r==="tecnico"?"Tecnico":"Tec. de Rede"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
            {(GLOBAL_PERM_LABELS[globalPermsTab] || GLOBAL_PERM_LABELS.default).map(({key,label,icon})=>{
              const on=globalPerms[globalPermsTab]?.[key]??false;
              return(<button key={key} onClick={()=>toggleGlobalPerm(globalPermsTab,key)} className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 ${on?"border-blue-500":"border-gray-200 opacity-55"}`} style={on?{background:"rgba(59,130,246,0.1)"}:{background:"var(--bg-main)"}}><span className="text-lg">{icon}</span><span className="text-xs font-semibold" style={{color:on?"var(--accent)":"var(--text-muted)"}}>{label}</span><span className={`text-xs font-bold ${on?"text-blue-500":"text-gray-400"}`}>{on?"ON":"OFF"}</span></button>);
            })}
          </div>
          <button onClick={()=>saveGlobalPerms(globalPermsTab)} disabled={savingGlobal} className="btn-primary text-sm py-2 px-5">{savingGlobal?"Salvando...":`Salvar ${globalPermsTab==="vendedor"?"Vendedor": globalPermsTab==="tecnico"?"Tecnico":"Tec. de Rede"}`}</button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Usuários</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{users.length} colaboradores cadastrados — {filtered.length} exibidos</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou ID..."
            className="input pl-9" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="input w-auto">
          <option value="">Todas as Funções</option>
          <option value="admin">Administrador</option>
          <option value="vendedor">Vendedor</option>
          <option value="tecnico">Técnico</option>
          <option value="manutencao">Técnico de Rede</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">Todos os Status</option>
          <option value="1">Ativo</option>
          <option value="0">Inativo</option>
        </select>
        {(filterRole || filterStatus || search) && (
          <button onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
            className="btn-secondary text-sm">
            <X className="w-4 h-4" /> Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header">Colaborador</th>
                  <th className="table-header">ID</th>
                  <th className="table-header">Função</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const Icon = roleIcon[u.role] || Shield;
                  return (
                    <tr key={u.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                            {u.photo_url
                              ? <img src={u.photo_url} className="w-full h-full object-cover" />
                              : <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{u.name[0]}</span>}
                          </div>
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                            {u.email && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono font-bold" style={{ color: 'var(--accent)' }}>{u.jd_id}</td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                          style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                          <Icon className="w-3 h-3" />{roleLabel[u.role]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={u.active ? 'badge-ativo' : 'badge-cancelado'}>{u.active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => openPerms(u)} className="p-1.5 rounded-lg" style={{ color: '#60a5fa' }} title="Configurar permissões">
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg"
                            style={{ color: u.active ? '#f59e0b' : '#4ade80' }} title={u.active ? 'Desativar' : 'Ativar'}>
                            {u.active ? <UserX className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                          {u.jd_id !== 'JD000001' && u.role === 'tecnico' && (
                            <button onClick={() => resetTechOS(u)} className="p-1.5 rounded-lg" style={{ color: '#f59e0b' }} title="Zerar OS e valores do técnico">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {u.jd_id !== 'JD000001' && (
                            <button onClick={() => setDeleteModal({ id: u.id, name: u.name, jd_id: u.jd_id })} className="p-1.5 rounded-lg" style={{ color: '#f87171' }} title="Excluir permanentemente">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-cell text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6" key={modal === 'create' ? 'create' : modal?.id}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {modal === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
              </h2>
              <button onClick={() => setModal(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {modal !== 'create' && (
                <div>
                  <label className="label">ID do Sistema</label>
                  <p className="font-mono font-bold text-lg" style={{ color: 'var(--accent)' }}>{modal.jd_id}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID não pode ser alterado</p>
                </div>
              )}
              <div>
                <label className="label">Nome Completo *</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input" placeholder="Nome do colaborador" autoComplete="off" />
              </div>
              <div>
                <label className="label">Função *</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className="input">
                  <option value="vendedor">Vendedor</option>
                  <option value="tecnico">Técnico</option>
                  <option value="manutencao">Técnico de Rede</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* ── Permissões da função selecionada ── */}
              {(() => {
                const perms = {
                  admin: [
                    [true,  'Dashboard completo (vendas, técnicos, comissões)'],
                    [true,  'Gerenciar usuários (criar, editar, excluir)'],
                    [true,  'Gerenciar clientes'],
                    [true,  'Gerenciar planos'],
                    [true,  'Gerenciar Ordens de Serviço'],
                    [true,  'Transferir / Manobrar OS entre técnicos'],
                    [true,  'Módulo Técnico'],
                    [true,  'Relatórios e comissões em PDF'],
                    [true,  'Chat com técnicos'],
                    [true,  'Configurações do sistema'],
                  ],
                  vendedor: [
                    [true,  'Dashboard (suas vendas e comissão)'],
                    [false, 'Gerenciar usuários'],
                    [true,  'Cadastrar e ver seus clientes'],
                    [true,  'Ver planos'],
                    [true,  'Criar e acompanhar suas OS'],
                    [false, 'Transferir OS'],
                    [false, 'Módulo Técnico'],
                    [false, 'Relatórios'],
                    [false, 'Chat'],
                    [false, 'Configurações'],
                  ],
                  tecnico: [
                    [true,  'Dashboard (suas instalações e ganhos)'],
                    [false, 'Gerenciar usuários'],
                    [false, 'Cadastrar clientes'],
                    [true,  'Ver planos'],
                    [true,  'Ver suas Ordens de Serviço'],
                    [false, 'Transferir OS'],
                    [true,  'Módulo Técnico (fotos, GPS, materiais)'],
                    [false, 'Relatórios'],
                    [true,  'Chat com administrador'],
                    [false, 'Configurações'],
                  ],
                  manutencao: [
                    [false, 'Dashboard'],
                    [false, 'Gerenciar usuários'],
                    [false, 'Clientes / Planos / OS'],
                    [true,  'Módulo Serviço de Rede'],
                    [true,  'Visualizar e executar ordens de rede'],
                    [true,  'Enviar fotos e registrar evidências'],
                    [true,  'Geolocalização e temporizador'],
                    [true,  'Finalizar serviço com PowerMeter'],
                    [true,  'Chat com administrador'],
                    [false, 'Configurações'],
                  ],
                };
                const list = perms[form.role] || [];
                const color = form.role === 'admin' ? '#3b82f6' : form.role === 'vendedor' ? '#10b981' : form.role === 'manutencao' ? '#8b5cf6' : '#f59e0b';
                return (
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-input)', border: `1px solid ${color}44` }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color }}>
                      Permissões — {roleLabel[form.role]}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {list.map(([ok, label]) => (
                        <div key={label} className="flex items-center gap-2 text-xs">
                          {ok
                            ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                            : <XCircle    className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f87171' }} />}
                          <span style={{ color: ok ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {modal === 'create' && (
                <div>
                  <label className="label">Senha (deixe em branco para usar "jd1234")</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(p => ({...p, password: e.target.value}))}
                      className="input pr-10" placeholder="Senha inicial" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              {modal !== 'create' && (
                <div>
                  <label className="label">Redefinir Senha (deixe em branco para manter)</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password||''}
                      onChange={e => setForm(p => ({...p, password: e.target.value}))}
                      className="input pr-10" placeholder="Nova senha..." autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              {modal !== 'create' && (
                <div>
                  <label className="label">Status</label>
                  <select value={form.active} onChange={e => setForm(p => ({...p, active: parseInt(e.target.value)}))} className="input">
                    <option value={1}>Ativo</option>
                    <option value={0}>Inativo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Permissions Modal ── */}
      {permModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPermModal(null)}>
          <div className="modal-box p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Settings2 className="w-5 h-5" style={{ color: '#60a5fa' }} />
                  Permissões de Acesso
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {permModal.name} — <span style={{ color: 'var(--accent)' }}>{roleLabel[permModal.role]}</span>
                </p>
              </div>
              <button onClick={() => setPermModal(null)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              {PERM_LABELS.map(({ key, label, icon }) => {
                const isDefault = defaultPerms[permModal.role]?.[key] ?? false;
                const isOn = permForm[key] ?? isDefault;
                const isCustomized = permModal.permissions && permModal.permissions[key] !== undefined && permModal.permissions[key] !== isDefault;
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--bg-input)', border: `1px solid ${isOn ? 'var(--accent)44' : 'var(--border)'}` }}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{icon}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Padrão: {isDefault ? 'Ativo' : 'Inativo'}
                          {isCustomized && <span style={{ color: '#f59e0b' }}> • Personalizado</span>}
                        </p>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button onClick={() => setPermForm(p => ({ ...p, [key]: !isOn }))}
                      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                      style={{ background: isOn ? 'var(--accent)' : 'var(--border)' }}>
                      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                        style={{ transform: isOn ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => {
                setPermForm({ ...defaultPerms[permModal.role] });
              }} className="btn-secondary text-sm flex-1">Restaurar Padrão</button>
              <button onClick={savePermissions} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Salvando...' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        itemName={deleteModal ? `${deleteModal.name} (${deleteModal.jd_id})` : 'este usuário'}
        onConfirmed={() => deleteUser(deleteModal)}
      />
    </div>
  );
}
