import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, X, RefreshCw, Eye, ClipboardList,
  ArrowRightLeft, Copy, Check, History, MapPin, Banknote
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const statusOpts = ['pendente','em_deslocamento','em_execucao','finalizado','cancelado'];
const statusLabel = { pendente:'Pendente', em_deslocamento:'Em Deslocamento', em_execucao:'Em Execução', finalizado:'Finalizado', cancelado:'Cancelado' };
function StatusBadge({ s }) { return <span className={`badge-${s}`}>{statusLabel[s]||s}</span>; }

const paySellerLabel = { pendente: 'Pendente', a_receber: 'A Receber', pago: 'Pago' };
const paySellerColor = { pendente: 'var(--text-muted)', a_receber: '#f59e0b', pago: '#22c55e' };
const payTechLabel   = { pendente: 'Pend. Téc.', pago: 'Pago' };
const payTechColor   = { pendente: '#f87171', pago: '#22c55e' };

function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }
  return (
    <button onClick={copy} title="Copiar ID Digitável"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono transition-colors"
      style={{ background: copied ? '#22c55e22' : 'var(--bg-input)', color: copied ? '#22c55e' : 'var(--accent)', border: '1px solid var(--border)' }}>
      {id}
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const reqs = [api.get('/orders'), api.get('/clients'), api.get('/plans')];
      if (user.role === 'admin') reqs.push(api.get('/users'));
      const [or, cr, pr, ur] = await Promise.all(reqs);
      setOrders(or.data);
      setClients(cr.data);
      setPlans(pr.data);
      if (ur) setTechnicians(ur.data.filter(u => u.role === 'tecnico'));
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function openTransferModal(order) {
    setSelected(order);
    setForm({ to_user_id: '', reason: '' });
    const r = await api.get(`/orders/${order.id}/transfers`).catch(() => ({ data: [] }));
    setTransfers(r.data);
    setModal('transfer');
  }

  async function saveTransfer() {
    if (!form.to_user_id) return toast.error('Selecione o técnico destino');
    setSaving(true);
    try {
      await api.post(`/orders/${selected.id}/transfer`, form);
      toast.success('OS transferida com sucesso!');
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao transferir'); }
    finally { setSaving(false); }
  }

  async function saveCreate() {
    if (!form.client_id || !form.plan_id) return toast.error('Cliente e plano obrigatórios');
    setSaving(true);
    try {
      const r = await api.post('/orders', form);
      toast.success(`OS criada! ID: ${r.data.readable_id}`);
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, status) {
    try { await api.put(`/orders/${id}/status`, { status }); toast.success('Status atualizado'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
  }

  async function markPayment(id, pay_seller, pay_tech) {
    try { await api.put(`/orders/${id}/payment`, { pay_seller, pay_tech }); toast.success('Pagamento registrado!'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
  }

  async function openView(order) {
    setSelected(order);
    const r = await api.get(`/orders/${order.id}/transfers`).catch(() => ({ data: [] }));
    setTransfers(r.data);
    setModal('view');
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = o.os_number?.toLowerCase().includes(q)
      || o.readable_id?.toLowerCase().includes(q)
      || o.client_name?.toLowerCase().includes(q)
      || o.technician_name?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchTech   = !filterTech   || String(o.technician_id) === filterTech;
    return matchSearch && matchStatus && matchTech;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Ordens de Serviço</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{filtered.length} de {orders.length} OS</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary p-2" title="Atualizar"><RefreshCw className="w-4 h-4" /></button>
          {user.role !== 'tecnico' && (
            <button onClick={() => { setForm({}); setModal('create'); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Nova OS
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por OS, ID, cliente ou técnico..." className="input pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">Todos os status</option>
          {statusOpts.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
        {user.role === 'admin' && technicians.length > 0 && (
          <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="input w-auto">
            <option value="">Todos os técnicos</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {(filterStatus || filterTech || search) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterTech(''); }} className="btn-secondary text-sm">
            <X className="w-4 h-4" /> Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header">ID Digitável</th>
                  <th className="table-header">Cliente</th>
                  <th className="table-header">Plano</th>
                  <th className="table-header">Técnico</th>
                  <th className="table-header">Agendamento</th>
                  <th className="table-header">Status</th>
                  {user.role === 'admin' && <th className="table-header">Pagamento</th>}
                  <th className="table-header">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="table-cell">
                      <CopyId id={o.readable_id || o.os_number} />
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.os_number}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.seller_name}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{o.plan_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.plan_speed}</p>
                    </td>
                    <td className="table-cell">
                      {o.technician_name
                        ? <span style={{ color: 'var(--text-secondary)' }}>{o.technician_name}</span>
                        : <span className="text-xs" style={{ color: '#f87171' }}>Sem técnico</span>}
                    </td>
                    <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="table-cell"><StatusBadge s={o.status} /></td>
                    {user.role === 'admin' && (
                      <td className="table-cell">
                        {o.status === 'finalizado' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold" style={{ color: paySellerColor[o.payment_seller_status || 'pendente'] }}>
                                Vend: {paySellerLabel[o.payment_seller_status || 'pendente']}
                              </span>
                              {o.payment_seller_status !== 'pago' && (
                                <button onClick={() => markPayment(o.id, true, false)}
                                  className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#22c55e22', color: '#22c55e' }}>
                                  Pagar
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold" style={{ color: payTechColor[o.payment_tech_status || 'pendente'] }}>
                                Téc: {payTechLabel[o.payment_tech_status || 'pendente']}
                              </span>
                              {o.payment_tech_status !== 'pago' && (
                                <button onClick={() => markPayment(o.id, false, true)}
                                  className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#22c55e22', color: '#22c55e' }}>
                                  Pagar
                                </button>
                              )}
                            </div>
                          </div>
                        ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    )}
                    <td className="table-cell">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => openView(o)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Detalhes">
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.role === 'admin' && (
                          <>
                            <button onClick={() => openTransferModal(o)}
                              className="p-1.5 rounded-lg" style={{ color: '#60a5fa' }} title="Transferir / Manobrar OS">
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <select onChange={e => e.target.value && updateStatus(o.id, e.target.value)} value=""
                              className="text-xs rounded px-1"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                              <option value="">Status</option>
                              {statusOpts.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                            </select>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma OS encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Nova Ordem de Serviço</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Cliente *</label>
                <select value={form.client_id||''} onChange={e=>setForm(p=>({...p,client_id:e.target.value}))} className="input">
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.cpf}</option>)}
                </select>
              </div>
              <div><label className="label">Plano *</label>
                <select value={form.plan_id||''} onChange={e=>setForm(p=>({...p,plan_id:e.target.value}))} className="input">
                  <option value="">Selecione o plano</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.speed}</option>)}
                </select>
              </div>
              {user.role === 'admin' && (
                <div><label className="label">Técnico</label>
                  <select value={form.technician_id||''} onChange={e=>setForm(p=>({...p,technician_id:e.target.value}))} className="input">
                    <option value="">Selecione o técnico</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.jd_id})</option>)}
                  </select>
                </div>
              )}
              <div><label className="label">Data de Instalação</label>
                <input type="date" value={form.scheduled_date||''} onChange={e=>setForm(p=>({...p,scheduled_date:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">ID Gold Fibra <span style={{color:'var(--text-muted)',fontWeight:'normal',fontSize:'0.75rem'}}>(fornecido pela operadora)</span></label>
                <input value={form.gold_fibra_id||''} onChange={e=>setForm(p=>({...p,gold_fibra_id:e.target.value}))} className="input" placeholder="Ex: GF-2024-00123" />
              </div>
              <div><label className="label">Observações</label>
                <textarea value={form.observations||''} onChange={e=>setForm(p=>({...p,observations:e.target.value}))} className="input h-20 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={saveCreate} disabled={saving} className="btn-primary">{saving ? 'Criando...' : 'Criar OS'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transferir / Manobrar OS Modal ── */}
      {modal === 'transfer' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <ArrowRightLeft className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                Transferir / Manobrar OS
              </h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID Digitável</p>
                  <CopyId id={selected.readable_id || selected.os_number} />
                </div>
                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cliente</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selected.client_name}</p></div>
                <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Técnico Atual</p>
                  <p className="text-sm" style={{ color: selected.technician_name ? 'var(--text-primary)' : '#f87171' }}>
                    {selected.technician_name || 'Sem técnico'}</p></div>
                <StatusBadge s={selected.status} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Transferir para *</label>
                <select value={form.to_user_id||''} onChange={e=>setForm(p=>({...p,to_user_id:e.target.value}))} className="input">
                  <option value="">Selecione o técnico destino</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.jd_id})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Motivo da transferência</label>
                <input value={form.reason||''} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} className="input" placeholder="Ex: Técnico indisponível, área de cobertura..." />
              </div>
            </div>

            {/* Histórico de transferências */}
            {transfers.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <History className="w-3 h-3" /> Histórico de Transferências
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {transfers.map((t, i) => (
                    <div key={t.id} className="px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap"
                      style={{ borderBottom: i < transfers.length-1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg-input)' : 'transparent' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#f87171' }}>{t.from_name || 'Sistema'}</span>
                        {' → '}
                        <span style={{ color: '#22c55e' }}>{t.to_name}</span>
                        {t.reason && <span style={{ color: 'var(--text-muted)' }}> — {t.reason}</span>}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(t.transferred_at).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={saveTransfer} disabled={saving} className="btn-primary">
                <ArrowRightLeft className="w-4 h-4" /> {saving ? 'Transferindo...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <ClipboardList className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  Detalhes da OS
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <CopyId id={selected.readable_id || selected.os_number} />
                  <StatusBadge s={selected.status} />
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[['Cliente', selected.client_name], ['Plano', `${selected.plan_name} — ${selected.plan_speed}`],
                ['Técnico', selected.technician_name || '—'], ['Vendedor', selected.seller_name || '—'],
                ['Agendamento', selected.scheduled_date ? new Date(selected.scheduled_date).toLocaleDateString('pt-BR') : '—'],
                ['Criado em', new Date(selected.created_at).toLocaleString('pt-BR')]].map(([l, v]) => (
                <div key={l}><p style={{ color: 'var(--text-muted)' }}>{l}</p><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{v}</p></div>
              ))}
              {selected.observations && <div className="col-span-2"><p style={{ color: 'var(--text-muted)' }}>Observações</p><p style={{ color: 'var(--text-primary)' }}>{selected.observations}</p></div>}
              {selected.gold_fibra_id && (
                <div className="col-span-2 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>ID Gold Fibra (Operadora)</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{selected.gold_fibra_id}</p>
                    <button onClick={() => { navigator.clipboard.writeText(selected.gold_fibra_id); }} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>Copiar</button>
                  </div>
                </div>
              )}
              {selected.geo_address && (
                <div className="col-span-2">
                  <p style={{ color: 'var(--text-muted)' }}>Localização GPS</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selected.geo_address}</p>
                    <a href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                      target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1 px-2">
                      <MapPin className="w-3 h-3" /> Abrir no Mapa
                    </a>
                  </div>
                </div>
              )}
              {selected.drop_total && <div><p style={{ color: 'var(--text-muted)' }}>DROP Total</p><p style={{ color: 'var(--text-primary)' }}>{selected.drop_total}m</p></div>}
            </div>

            {/* Histórico de transferências */}
            {transfers.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <History className="w-3 h-3" /> Histórico de Manobras
                </p>
                <div className="space-y-1">
                  {transfers.map(t => (
                    <div key={t.id} className="text-xs flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                      <span><span style={{ color: '#f87171' }}>{t.from_name||'Sistema'}</span> → <span style={{ color: '#22c55e' }}>{t.to_name}</span>{t.reason ? ` — ${t.reason}` : ''}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(t.transferred_at).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
