import { useState } from 'react';
import { getUsers, addUser, updateUser, deleteUser } from './store';
import { Plus, Edit, Trash2, X, Shield, User, Briefcase, Search, Filter } from 'lucide-react';

const ROLES = ['admin', 'advogado', 'assistente'];
const ROLE_ICONS = { admin: Shield, advogado: Briefcase, assistente: User };
const ROLE_COLORS = { admin: '#C9A84C', advogado: '#27AE60', assistente: '#2980B9' };

export default function Usuarios({ user }) {
  const [users, setUsers] = useState(getUsers());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('todos');

  const reload = () => setUsers(getUsers());

  function openNew() { setForm({ role: 'advogado', password: '' }); setModal('new'); }
  function openEdit(u) { setForm({ ...u }); setModal(u.id); }

  function handleSave() {
    if (modal === 'new') addUser(form);
    else updateUser(modal, form);
    reload();
    setModal(null);
  }

  function handleDelete(id) {
    if (id === user.id) { alert('Não é possível excluir seu próprio usuário.'); return; }
    if (confirm('Excluir este usuário?')) { deleteUser(id); reload(); }
  }

  // Filtragem
  const filtered = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.loginCode?.toLowerCase().includes(search.toLowerCase()) ||
      u.oab?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'todos' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  if (user.role !== 'admin' && user.role !== 'master') {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--white-dim)' }}>
        <Shield size={40} style={{ margin: '0 auto 12px', color: 'var(--gold-dark)' }} />
        <p>Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)' }}>Usuários</h1>
          <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>
            {filtered.length} de {users.length} usuário(s)
          </p>
        </div>
        <button className="btn-gold" onClick={openNew} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--white-dim)' }} />
          <input
            className="input-dark"
            style={{ paddingLeft: '36px' }}
            placeholder="Buscar por nome, código ou OAB..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro por perfil */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['todos', 'admin', 'advogado', 'assistente'].map(r => {
            const color = ROLE_COLORS[r] || 'var(--gold)';
            const active = filterRole === r;
            return (
              <button key={r} onClick={() => setFilterRole(r)} style={{
                padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                border: `1px solid ${active ? color : 'rgba(201,168,76,0.2)'}`,
                background: active ? `${color}18` : 'transparent',
                color: active ? color : 'var(--white-dim)',
                textTransform: 'capitalize', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                {r === 'admin' && <Shield size={11} />}
                {r === 'advogado' && <Briefcase size={11} />}
                {r === 'assistente' && <User size={11} />}
                {r === 'todos' && <Filter size={11} />}
                {r === 'todos' ? 'Todos' : r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contagem por perfil */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['admin', 'advogado', 'assistente'].map(r => {
          const count = users.filter(u => u.role === r).length;
          const color = ROLE_COLORS[r];
          const Icon = ROLE_ICONS[r];
          return (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: `${color}0D`, border: `1px solid ${color}25`, borderRadius: '8px' }}>
              <Icon size={13} color={color} />
              <span style={{ color: 'var(--white-dim)', fontSize: '12px', textTransform: 'capitalize' }}>{r}:</span>
              <span style={{ color, fontSize: '13px', fontWeight: '700' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--white-dim)' }}>
          <User size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>Nenhum usuário encontrado para este filtro.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {filtered.map(u => {
            const Icon = ROLE_ICONS[u.role] || User;
            const color = ROLE_COLORS[u.role] || 'var(--gold)';
            return (
              <div key={u.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ width: '48px', height: '48px', background: `${color}18`, border: `1px solid ${color}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color, fontSize: '18px', fontWeight: '700' }}>{u.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--white)', fontSize: '14px', fontWeight: '500' }}>{u.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon size={11} color={color} />
                      <span style={{ color, fontSize: '11px', textTransform: 'capitalize' }}>{u.role}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                  {u.loginCode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--white-dim)', fontSize: '11px' }}>Código:</span>
                      <span style={{ color: 'var(--gold)', fontFamily: 'Cinzel, serif', fontSize: '13px', fontWeight: '700', letterSpacing: '0.1em' }}>{u.loginCode}</span>
                    </div>
                  )}
                  {u.email && <div style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{u.email}</div>}
                  {u.oab && (
                    <div style={{ color: 'var(--white-dim)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Shield size={11} color="var(--gold-dark)" /> {u.oab}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(u)} style={{ flex: 1, padding: '6px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Edit size={12} /> Editar
                  </button>
                  {u.id !== user.id && (
                    <button onClick={() => handleDelete(u.id)} style={{ padding: '6px 12px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal novo/editar */}
      {modal !== null && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px' }}>{modal === 'new' ? 'Novo Usuário' : 'Editar Usuário'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modal === 'new' && (
                <div style={{ padding: '10px 14px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--white-dim)', fontSize: '12px' }}>
                    O código de acesso (<span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>AD00X</span>) será gerado automaticamente ao salvar.
                  </p>
                </div>
              )}
              {[['Nome Completo', 'name', 'text'], ['E-mail (opcional)', 'email', 'email'], ['Senha', 'password', 'password'], ['OAB (opcional)', 'oab', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>{label}</label>
                  <input className="input-dark" type={type} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Perfil de Acesso</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {ROLES.map(r => {
                    const Icon = ROLE_ICONS[r];
                    const color = ROLE_COLORS[r];
                    return (
                      <button key={r} onClick={() => setForm({ ...form, role: r })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${form.role === r ? color : 'rgba(201,168,76,0.2)'}`, background: form.role === r ? `${color}18` : 'transparent', color: form.role === r ? color : 'var(--white-dim)', cursor: 'pointer', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
                        <Icon size={16} /> {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Cancelar</button>
              <button className="btn-gold" onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
