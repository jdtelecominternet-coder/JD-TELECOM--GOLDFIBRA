import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Eye, EyeOff, Shield, ShoppingBag, Wrench, UserX, CheckCircle, XCircle, Settings2, Globe, RotateCcw, Network, Package, RefreshCw, ArrowRightLeft, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import AdminDeleteModal from '../components/AdminDeleteModal';

const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Técnico', manutencao: 'Técnico de Rede', qualidade: 'Controle de Qualidade' };
const roleIcon  = { admin: Shield, vendedor: ShoppingBag, tecnico: Wrench, manutencao: Network, qualidade: CheckCircle };

// Permissões padrão por role
const defaultPerms = {
  admin:      { clients: true, plans: true, orders: true, technical: true, reports: true, chat: true, gerar_link: true },
  vendedor:   { clients: true, plans: true, orders: true, technical: false, reports: false, chat: false, gerar_link: true },
  tecnico:    { clients: false, plans: true, orders: false, technical: true, reports: false, chat: true, gerar_link: false },
  manutencao: { clients: false, plans: false, orders: false, technical: false, reports: false, chat: true, gerar_link: false, servico_rede: true },
  qualidade:  { clients: false, plans: false, orders: false, technical: false, reports: true, chat: true, gerar_link: false, quality_control: true },
};
const PERM_LABELS = [
  { key: 'clients',         label: 'Clientes',                icon: '👥' },
  { key: 'plans',           label: 'Planos',                  icon: '📦' },
  { key: 'orders',          label: 'Ordens de Serviço',       icon: '📋' },
  { key: 'technical',       label: 'Módulo Técnico',           icon: '🛠️' },
  { key: 'servico_rede',    label: 'Módulo Serviço de Rede',  icon: '🌐' },
  { key: 'quality_control', label: 'Controle de Qualidade',   icon: '✅' },
  { key: 'reports',         label: 'Relatórios',              icon: '📊' },
  { key: 'chat',            label: 'Chat Interno',            icon: '💬' },
  { key: 'gerar_link',      label: 'Gerar Link de Cadastro',  icon: '🔗' },
];

const GLOBAL_PERM_LABELS = {
  default: [
    { key: 'dashboard',       label: 'Dashboard',             icon: '📊' },
    { key: 'users',           label: 'Gerenciar Usuarios',    icon: '👥' },
    { key: 'clients',         label: 'Clientes',              icon: '🤝' },
    { key: 'plans',           label: 'Planos',                icon: '📦' },
    { key: 'orders',          label: 'Ordens de Servico',     icon: '📋' },
    { key: 'transfer',        label: 'Transferir OS',         icon: '🔄' },
    { key: 'technical',       label: 'Modulo Tecnico',        icon: '🛠️' },
    { key: 'reports',         label: 'Relatorios',            icon: '📈' },
    { key: 'chat',            label: 'Chat',                  icon: '💬' },
    { key: 'ai',              label: 'Assistente IA',         icon: '🤖' },
    { key: 'settings',        label: 'Configuracoes',         icon: '⚙️' },
  ],
  manutencao: [
    { key: 'dashboard',    label: 'Dashboard',            icon: '📊' },
    { key: 'servico_rede', label: 'Modulo Serv. de Rede', icon: '🌐' },
    { key: 'clients',      label: 'Clientes',             icon: '🤝' },
    { key: 'orders',       label: 'Ordens de Servico',    icon: '📋' },
    { key: 'chat',         label: 'Chat',                 icon: '💬' },
    { key: 'ai',           label: 'Assistente IA',        icon: '🤖' },
    { key: 'reports',      label: 'Relatorios',           icon: '📈' },
    { key: 'settings',     label: 'Configuracoes',        icon: '⚙️' },
  ],
  qualidade: [
    { key: 'dashboard',       label: 'Dashboard',             icon: '📊' },
    { key: 'quality_control', label: 'Controle de Qualidade', icon: '✅' },
    { key: 'clients',         label: 'Clientes',              icon: '🤝' },
    { key: 'orders',          label: 'Ordens de Servico',     icon: '📋' },
    { key: 'chat',            label: 'Chat',                  icon: '💬' },
    { key: 'ai',              label: 'Assistente IA',         icon: '🤖' },
    { key: 'reports',         label: 'Relatorios',            icon: '📈' },
    { key: 'settings',        label: 'Configuracoes',         icon: '⚙️' },
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
  const [deleteModal, setDeleteModal] = useState(null); // { id, name, id }
  const [adminAuthModal, setAdminAuthModal] = useState(null); // user to edit after auth
  const [adminAuthPw, setAdminAuthPw] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [globalAuthModal, setGlobalAuthModal] = useState(null); // role pendente
  const [globalAuthPw, setGlobalAuthPw] = useState('');
  const [globalAuthError, setGlobalAuthError] = useState('');
  // ── Painel Estoque Admin ──
  const [stockOpen, setStockOpen] = useState(false);
  const [allStock, setAllStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockFilter, setStockFilter] = useState('');
  const [assignModal, setAssignModal] = useState(null); // { stock_id, current_tech }
  const [assignTechId, setAssignTechId] = useState('');
  const [batchModal, setBatchModal] = useState(false);
  const [batchTechId, setBatchTechId] = useState('');
  const [batchText, setBatchText] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  async function loadAllStock() {
    setStockLoading(true);
    try { const r = await api.get('/stock'); setAllStock(r.data); }
    catch { toast.error('Erro ao carregar estoque'); }
    finally { setStockLoading(false); }
  }
  async function handleAssign() {
    if (!assignTechId) return toast.error('Selecione um técnico');
    try {
      await api.post('/stock/assign', { stock_id: assignModal.stock_id, tech_id: assignTechId });
      toast.success('ONU transferida!');
      setAssignModal(null); setAssignTechId('');
      loadAllStock();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
  }
  async function handleDeleteStock(id) {
    try { await api.delete(`/stock/${id}`); toast.success('ONU removida'); loadAllStock(); }
    catch { toast.error('Erro ao remover'); }
  }
  async function handleBatchAdmin() {
    if (!batchTechId) return toast.error('Selecione o técnico destino');
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error('Informe ao menos um MAC');
    const items = lines.map(line => {
      const parts = line.split(/[\t,;]/);
      return { mac_address: parts[0]?.trim(), modelo: parts[1]?.trim() || '', serial: parts[2]?.trim() || '' };
    });
    setBatchSaving(true);
    try {
      const r = await api.post('/stock/batch', { items, tech_id: batchTechId });
      toast.success(`${r.data.ok.length} ONUs cadastradas para o técnico!`);
      if (r.data.errors?.length) toast.error(`${r.data.errors.length} erros.`);
      setBatchModal(false); setBatchText(''); setBatchTechId('');
      loadAllStock();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setBatchSaving(false); }
  }

  async function load() {
    try { const r = await api.get('/users'); setUsers(r.data); } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.get("/settings/role-permissions").then(r => {
      const data = r.data || {};
      // Garante que todos os perfis existem com defaults
      const merged = {
        vendedor:   { clients: true, plans: true, orders: true, technical: false, reports: false, chat: false, gerar_link: true, ...( data.vendedor   || {}) },
        tecnico:    { clients: false, plans: true, orders: false, technical: true, reports: false, chat: true, gerar_link: false, ...(data.tecnico    || {}) },
        manutencao: { servico_rede: true, chat: true, reports: false, settings: false,                         ...(data.manutencao || {}) },
        qualidade:  { quality_control: true, chat: true, reports: false, settings: false,                      ...(data.qualidade  || {}) },
      };
      setGlobalPerms(merged);
    }).catch(() => {
      setGlobalPerms({
        vendedor:   { clients: true, plans: true, orders: true, technical: false, reports: false, chat: false, gerar_link: true },
        tecnico:    { clients: false, plans: true, orders: false, technical: true, reports: false, chat: true, gerar_link: false },
        manutencao: { servico_rede: true, chat: true, reports: false, settings: false },
        qualidade:  { quality_control: true, chat: true, reports: false, settings: false },
      });
    });
  }, []);
  async function saveGlobalPerms(role) {
    // Pede senha do admin principal antes de salvar
    setGlobalAuthPw('');
    setGlobalAuthError('');
    setGlobalAuthModal(role);
  }
  async function confirmGlobalAuth() {
    try {
      await api.post('/users/verify-admin-password', { password: globalAuthPw });
      const role = globalAuthModal;
      setGlobalAuthModal(null);
      setSavingGlobal(true);
      try { await api.put("/settings/role-permissions", { role, permissions: globalPerms[role] }); toast.success("Permissoes salvas!"); }
      catch { toast.error("Erro ao salvar"); }
      finally { setSavingGlobal(false); }
    } catch {
      setGlobalAuthError('Senha incorreta. Tente novamente.');
    }
  }
  function toggleGlobalPerm(role, key) { setGlobalPerms(prev => ({ ...prev, [role]: { ...(prev[role] || {}), [key]: !(prev[role] || {})[key] } })); }

  async function save() {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    setSaving(true);
    try {
      if (modal === 'create') {
        const r = await api.post('/users', form);
        toast.success(`Usuário criado! ID: ${r.data.jd_id} | Senha: ${form.password || 'id1234'}`);
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
    let custom = {};
    try {
      const raw = u.permissions;
      custom = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch { custom = {}; }
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
    if (u.role === 'admin') {
      setAdminAuthPw('');
      setAdminAuthError('');
      setAdminAuthModal(u);
      return;
    }
    setForm({ name: u.name, role: u.role, password: '', active: u.active });
    setShowPw(false);
    setModal(u);
  }

  async function confirmAdminAuth() {
    try {
      await api.post('/users/verify-admin-password', { password: adminAuthPw });
      const u = adminAuthModal;
      setAdminAuthModal(null);
      setForm({ name: u.name, role: u.role, password: '', active: u.active });
      setShowPw(false);
      setModal(u);
    } catch {
      setAdminAuthError('Senha incorreta. Tente novamente.');
    }
  }

  return (
    <>
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
            {["vendedor","tecnico","manutencao","qualidade"].map(r=>(
              <button key={r} onClick={()=>setGlobalPermsTab(r)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${globalPermsTab===r?"bg-blue-600 text-white":"opacity-60"}`} style={globalPermsTab!==r?{background:"var(--bg-main)",color:"var(--text-secondary)",border:"1px solid var(--border)"}:{}}>
                {r==="vendedor"?"Vendedor": r==="tecnico"?"Técnico": r==="manutencao"?"Tec. de Rede":"Ctrl. Qualidade"}
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
          <option value="qualidade">Controle de Qualidade</option>
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
                      <td className="table-cell font-mono font-bold" style={{ color: 'var(--accent)' }}>ID{u.jd_id?.replace(/^ID/i, '')}</td>
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
                          {/* Botão editar — sempre visível, mas admin principal exige senha */}
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => openPerms(u)} className="p-1.5 rounded-lg" style={{ color: '#60a5fa' }} title="Configurar permissões">
                            <Settings2 className="w-4 h-4" />
                          </button>
                          {/* Desativar — bloqueado para admin principal */}
                          {u.jd_id !== '000001' && u.jd_id !== 'JD000001' && (
                            <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg"
                              style={{ color: u.active ? '#f59e0b' : '#4ade80' }} title={u.active ? 'Desativar' : 'Ativar'}>
                              {u.active ? <UserX className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                          )}
                          {u.jd_id !== '000001' && u.jd_id !== 'ID000001' && u.role === 'tecnico' && (
                            <button onClick={() => resetTechOS(u)} className="p-1.5 rounded-lg" style={{ color: '#f59e0b' }} title="Zerar OS e valores do técnico">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {/* Excluir — bloqueado para admin principal */}
                          {u.jd_id !== '000001' && u.jd_id !== 'JD000001' && (
                            <button onClick={() => setDeleteModal({ id: u.id, name: u.name, jd_id: u.jd_id })} className="p-1.5 rounded-lg" style={{ color: '#f87171' }} title="Excluir permanentemente">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {/* Ícone de cadeado para admin principal */}
                          {(u.jd_id === '000001' || u.jd_id === 'ID000001') && (
                            <span title="Administrador Principal protegido" style={{ fontSize: 16 }}>🔒</span>
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
          <option value="qualidade">Controle de Qualidade</option>
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
                const _perms = (() => { try { const r = permModal.permissions; return typeof r === 'string' ? JSON.parse(r) : (r || {}); } catch { return {}; } })();
                const isCustomized = _perms[key] !== undefined && _perms[key] !== isDefault;
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

      {/* Modal de autenticação para editar admin */}
      {adminAuthModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, border: '1.5px solid #3b82f680' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Shield style={{ color: '#3b82f6', width: 22, height: 22 }} />
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: 17 }}>Acesso Restrito</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>
              Para editar o perfil do <strong style={{ color: '#3b82f6' }}>Administrador</strong>, confirme a senha:
            </p>
            <input
              type="password"
              value={adminAuthPw}
              onChange={e => { setAdminAuthPw(e.target.value); setAdminAuthError(''); }}
              onKeyDown={e => e.key === 'Enter' && confirmAdminAuth()}
              placeholder="Digite a senha do administrador"
              autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${adminAuthError ? '#dc2626' : 'var(--border)'}`, background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
            />
            {adminAuthError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>❌ {adminAuthError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setAdminAuthModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmAdminAuth} disabled={!adminAuthPw}
                style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: adminAuthPw ? '#3b82f6' : '#334155', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                🔓 Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal senha para salvar permissões globais */}
      {globalAuthModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, border: '1.5px solid #f59e0b80' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Shield style={{ color: '#f59e0b', width: 22, height: 22 }} />
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: 17 }}>Confirmação do Admin Principal</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>
              Para alterar as <strong style={{ color: '#f59e0b' }}>Permissões Globais</strong>, confirme a senha do administrador principal:
            </p>
            <input
              type="password" value={globalAuthPw}
              onChange={e => { setGlobalAuthPw(e.target.value); setGlobalAuthError(''); }}
              onKeyDown={e => e.key === 'Enter' && confirmGlobalAuth()}
              placeholder="Senha do administrador principal" autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${globalAuthError ? '#dc2626' : 'var(--border)'}`, background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
            />
            {globalAuthError && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>❌ {globalAuthError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setGlobalAuthModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmGlobalAuth} disabled={!globalAuthPw}
                style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: globalAuthPw ? '#f59e0b' : '#334155', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                🔓 Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ═══════════════════════════════════════════════════════════
        PAINEL ADMIN — ESTOQUE DE ONUs
    ═══════════════════════════════════════════════════════════ */}
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => { setStockOpen(o => !o); if (!stockOpen) loadAllStock(); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package style={{ color: 'var(--accent)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-primary)' }}>Gerenciar Estoque de ONUs</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Visualize, transfira e cadastre em lote por técnico</div>
          </div>
        </div>
        {stockOpen ? <ChevronUp style={{ color: 'var(--text-muted)' }} /> : <ChevronDown style={{ color: 'var(--text-muted)' }} />}
      </button>

      {stockOpen && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
            <button onClick={() => setBatchModal(true)} style={adminBtn('#1d4ed8')}>
              <Plus size={14} /> Cadastrar em Lote
            </button>
            <button onClick={loadAllStock} style={adminBtn('#475569')}>
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          {/* Filtro por status */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['disponivel', 'Disponíveis'], ['utilizado', 'Em Uso'], ['defeito', 'Defeito']].map(([v, l]) => (
              <button key={v} onClick={() => setStockFilter(v)} style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                background: stockFilter === v ? '#1e293b' : '#e2e8f0', color: stockFilter === v ? '#fff' : '#475569',
              }}>{l}</button>
            ))}
          </div>

          {stockLoading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>}

          {!stockLoading && (() => {
            const techs = [...new Set(allStock.map(i => i.tech_name || `Técnico ${i.tech_id}`))].sort();
            const filtered = stockFilter ? allStock.filter(i => i.status === stockFilter) : allStock;

            if (!filtered.length) return (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p>Nenhuma ONU cadastrada</p>
              </div>
            );

            // Agrupar por técnico
            const byTech = {};
            filtered.forEach(item => {
              const key = item.tech_name || `Técnico ${item.tech_id}`;
              if (!byTech[key]) byTech[key] = [];
              byTech[key].push(item);
            });

            return Object.entries(byTech).map(([techName, items]) => {
              const disp = items.filter(i => i.status === 'disponivel').length;
              const used  = items.filter(i => i.status === 'utilizado').length;
              const def   = items.filter(i => i.status === 'defeito').length;
              return (
                <div key={techName} style={{ marginBottom: 16, background: 'var(--bg-input)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, background: 'rgba(59,130,246,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Wrench size={16} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>{techName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={badge('#dcfce7','#166534')}>📦 {disp}</span>
                      <span style={badge('#e0e7ff','#3730a3')}>✅ {used}</span>
                      {def > 0 && <span style={badge('#fee2e2','#991b1b')}>⚠️ {def}</span>}
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    {items.map(item => {
                      const sb = item.status === 'disponivel' ? { bg: '#dcfce7', c: '#166534', l: 'Disponível' }
                               : item.status === 'utilizado'  ? { bg: '#e0e7ff', c: '#3730a3', l: 'Em Uso' }
                               : { bg: '#fee2e2', c: '#991b1b', l: 'Defeito' };
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 8, flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.mac_address}</span>
                            {item.modelo && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{item.modelo}</span>}
                            {item.client_name && <div style={{ fontSize: 11, color: '#3730a3' }}>👤 {item.client_name}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sb.bg, color: sb.c }}>{sb.l}</span>
                            {item.status === 'disponivel' && (
                              <button onClick={() => { setAssignModal({ stock_id: item.id, current_tech: techName, mac: item.mac_address }); setAssignTechId(''); }}
                                title="Transferir para outro técnico"
                                style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: '#dbeafe', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                                <ArrowRightLeft size={12} /> Transferir
                              </button>
                            )}
                            <button onClick={() => handleDeleteStock(item.id)} title="Remover"
                              style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>

    {/* Modal: Transferir ONU */}
    {assignModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 14, color: 'var(--text-primary)' }}>🔄 Transferir ONU</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            MAC: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{assignModal.mac}</strong><br/>
            Técnico atual: <strong>{assignModal.current_tech}</strong>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Transferir para:</label>
          <select value={assignTechId} onChange={e => setAssignTechId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>
            <option value="">-- Selecione o técnico --</option>
            {users.filter(u => u.role === 'tecnico' && u.active).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setAssignModal(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAssign} disabled={!assignTechId} style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: assignTechId ? '#1d4ed8' : '#475569', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>✅ Confirmar Transferência</button>
          </div>
        </div>
      </div>
    )}

    {/* Modal: Cadastro em lote (admin) */}
    {batchModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 460 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--text-primary)' }}>📋 Cadastrar ONUs em Lote</span>
            <button onClick={() => setBatchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22 }}><X /></button>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Técnico destino:</label>
          <select value={batchTechId} onChange={e => setBatchTechId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>
            <option value="">-- Selecione o técnico --</option>
            {users.filter(u => u.role === 'tecnico' && u.active).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            ONUs (uma por linha — <code>MAC,Modelo,Serial</code>):
          </label>
          <textarea value={batchText} onChange={e => setBatchText(e.target.value)} rows={7}
            placeholder={'AA:BB:CC:DD:EE:01,ZTE F601\nAA:BB:CC:DD:EE:02,Huawei HG8010H\nAA:BB:CC:DD:EE:03'}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setBatchModal(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleBatchAdmin} disabled={batchSaving || !batchTechId} style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: batchTechId ? '#1d4ed8' : '#475569', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {batchSaving ? 'Importando...' : '📥 Importar Lote'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

// ── Helpers de estilo ────────────────────────────────────────
function adminBtn(bg) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 9, border: 'none',
    background: bg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };
}
function badge(bg, color) {
  return { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color };
}
