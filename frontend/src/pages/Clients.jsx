import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, MapPin, Phone, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const statusOpts = ['pendente', 'ativo', 'cancelado'];
const dueDays = [5, 10, 15, 20, 25];

function StatusBadge({ s }) {
  return <span className={`badge-${s}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [cr, pr, ur] = await Promise.all([
        api.get('/clients'),
        api.get('/plans'),
        user.role === 'admin' ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      setClients(cr.data);
      setPlans(pr.data);
      setSellers(ur.data.filter(u => u.role === 'vendedor'));
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function lookupCep(cep) {
    const clean = cep.replace(/\D/g,'');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (d.erro) { toast.error('CEP não encontrado'); return; }
      setForm(p => ({ ...p, street: d.logradouro, neighborhood: d.bairro, city: d.localidade, state: d.uf, cep: clean }));
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setCepLoading(false); }
  }

  async function save() {
    if (!form.name?.trim()) return toast.error('Nome obrigatório');
    if (!form.cpf?.trim()) return toast.error('CPF obrigatório');
    setSaving(true);
    try {
      if (!form.id) {
        await api.post('/clients', form);
        toast.success('Cliente cadastrado!');
      } else {
        await api.put(`/clients/${form.id}`, form);
        toast.success('Cliente atualizado!');
      }
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  }

  function openCreate() { setForm({}); setModal('form'); }
  function openEdit(c) { setForm({...c}); setModal('form'); }

  async function del(id) {
    if (!confirm('Remover cliente?')) return;
    try { await api.delete(`/clients/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); }
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (!filterStatus || c.status === filterStatus) &&
      (c.name.toLowerCase().includes(q) || c.cpf.includes(q) || c.whatsapp?.includes(q));
  });

  const fmtCpf = v => v?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Cliente</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, CPF ou WhatsApp..." className="input pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">Todos os status</option>
          {statusOpts.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
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
                  <th className="table-header">Cliente</th>
                  <th className="table-header">CPF</th>
                  <th className="table-header">Contato</th>
                  <th className="table-header">Plano</th>
                  <th className="table-header">Vendedor</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="table-cell">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="w-3 h-3" />{c.city || '—'}
                      </p>
                    </td>
                    <td className="table-cell font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{fmtCpf(c.cpf)}</td>
                    <td className="table-cell">
                      {c.whatsapp && <p className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-primary)' }}><Phone className="w-3 h-3" style={{ color: '#4ade80' }} />{c.whatsapp}</p>}
                      {c.due_day && <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Calendar className="w-3 h-3" />Vence dia {c.due_day}</p>}
                    </td>
                    <td className="table-cell">
                      {c.plan_name ? (
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.plan_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.plan_speed} | R$ {Number(c.plan_price).toFixed(2)}</p>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{c.seller_name || '—'}</td>
                    <td className="table-cell"><StatusBadge s={c.status} /></td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.role === 'admin' && (
                          <button onClick={() => del(c.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#f87171' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'form' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome Completo *</label>
                <input value={form.name||''} onChange={e => setForm(p=>({...p,name:e.target.value}))} className="input" placeholder="Nome completo" />
              </div>
              <div>
                <label className="label">CPF *</label>
                <input value={form.cpf||''} onChange={e => setForm(p=>({...p,cpf:e.target.value.replace(/\D/g,'').slice(0,11)}))} className="input" placeholder="00000000000" maxLength={11} />
              </div>
              <div>
                <label className="label">Data de Nascimento</label>
                <input type="date" value={form.birth_date||''} onChange={e => setForm(p=>({...p,birth_date:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input value={form.whatsapp||''} onChange={e => setForm(p=>({...p,whatsapp:e.target.value}))} className="input" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="label">CEP</label>
                <div className="flex gap-2">
                  <input value={form.cep||''} onChange={e => setForm(p=>({...p,cep:e.target.value.replace(/\D/g,'').slice(0,8)}))} className="input" placeholder="00000000" maxLength={8} />
                  <button type="button" onClick={() => lookupCep(form.cep||'')} disabled={cepLoading} className="btn-secondary whitespace-nowrap px-3">
                    {cepLoading ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Rua/Logradouro</label>
                <input value={form.street||''} onChange={e => setForm(p=>({...p,street:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">Número</label>
                <input value={form.number||''} onChange={e => setForm(p=>({...p,number:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">Complemento</label>
                <input value={form.complement||''} onChange={e => setForm(p=>({...p,complement:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">Bairro</label>
                <input value={form.neighborhood||''} onChange={e => setForm(p=>({...p,neighborhood:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input value={form.city||''} onChange={e => setForm(p=>({...p,city:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">Estado</label>
                <input value={form.state||''} onChange={e => setForm(p=>({...p,state:e.target.value.slice(0,2).toUpperCase()}))} className="input" maxLength={2} />
              </div>
              <div>
                <label className="label">Dia de Vencimento</label>
                <select value={form.due_day||''} onChange={e => setForm(p=>({...p,due_day:e.target.value}))} className="input">
                  <option value="">Selecione</option>
                  {dueDays.map(d => <option key={d} value={d}>Dia {d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plano</label>
                <select value={form.plan_id||''} onChange={e => setForm(p=>({...p,plan_id:e.target.value}))} className="input">
                  <option value="">Selecione um plano</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {p.speed} - R$ {Number(p.price).toFixed(2)}</option>)}
                </select>
              </div>
              {user.role === 'admin' && (
                <div>
                  <label className="label">Vendedor</label>
                  <select value={form.seller_id||''} onChange={e => setForm(p=>({...p,seller_id:e.target.value}))} className="input">
                    <option value="">Selecione</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {user.role === 'admin' && form.id && (
                <div>
                  <label className="label">Status</label>
                  <select value={form.status||'pendente'} onChange={e => setForm(p=>({...p,status:e.target.value}))} className="input">
                    {statusOpts.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
