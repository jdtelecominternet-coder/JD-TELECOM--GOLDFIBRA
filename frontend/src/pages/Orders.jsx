import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSync } from '../hooks/useSync';
import toast from 'react-hot-toast';
import {
  Plus, Search, X, RefreshCw, Eye, ClipboardList,
  ArrowRightLeft, Copy, Check, History, MapPin, Banknote, FileText, Trash2
} from 'lucide-react';
import { generateOrderPDF } from '../utils/generateOrderPDF';
import { useAuth } from '../contexts/AuthContext';
import AdminDeleteModal from '../components/AdminDeleteModal';

const statusOpts = ['pendente','em_deslocamento','em_execucao','finalizado','cancelado'];

const TIPO_OS_OPTS = [
  'Adesão / Ativação',
  'Mudança de Endereço',
  'Troca de Equipamento',
  'Retirada de Equipamento',
  'Troca de Drop (Rompimento)',
];

// Valor padrão por tipo de OS (fallback hardcoded, substituído pela API)
const VALOR_PADRAO_TIPO = {
  'Adesão / Ativação':        120,
  'Mudança de Endereço':       80,
  'Troca de Equipamento':      60,
  'Retirada de Equipamento':   50,
  'Troca de Drop (Rompimento)':70,
};
const sellerStatusLabel = {};
const sellerStatusColor = {};
const sellerStatusBg    = {};
const installPeriodLabel = { manha: 'Manhã ☀️', tarde: 'Tarde 🌤️' };
const statusLabel = { pendente:'Pendente de Instalação', em_deslocamento:'Em Deslocamento', em_execucao:'Em Execução', finalizado:'Instalação Finalizada', cancelado:'Cancelado' };
function StatusBadge({ s }) { return <span className={`badge-${s}`}>{statusLabel[s]||s}</span>; }

// pagamento gerenciado exclusivamente pelo Dashboard — remover das constantes de OS
const paySellerLabel = {};
const paySellerColor = {};
const payTechLabel   = {};
const payTechColor   = {};

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
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [valorPadrao, setValorPadrao] = useState(VALOR_PADRAO_TIPO);
  const [tiposOs, setTiposOs] = useState([]);

  const [modal, setModal] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sellerStatusModal, setSellerStatusModal] = useState(null);
  const [sellerForm, setSellerForm] = useState({ seller_status: '', admin_message: '' });
  const [savingSeller, setSavingSeller] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { id, name }

  async function deleteOrder(id) {
    await api.delete(`/orders/${id}`);
    toast.success('OS removida!');
    load();
  }

  async function saveSellerStatus() {
    setSavingSeller(true);
    try {
      await api.put(`/orders/${sellerStatusModal.order.id}/seller-status`, sellerForm);
      toast.success('Status de venda atualizado!');
      setSellerStatusModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSavingSeller(false); }
  }

  async function load() {
    try {
      const reqs = [api.get('/orders'), api.get('/clients'), api.get('/plans'), api.get('/tipos-os').catch(() => ({ data: [] }))];
      if (user.role === 'admin') reqs.push(api.get('/users'));
      const [or, cr, pr, tiposRes, ur] = await Promise.all(reqs);
      setOrders(or.data);
      setClients(cr.data);
      setPlans(pr.data);
      if (tiposRes.data?.length) {
        setTiposOs(tiposRes.data);
        const map = {};
        tiposRes.data.forEach(t => { map[t.nome] = t.valor_padrao; });
        setValorPadrao(v => ({ ...v, ...map }));
      }
      if (ur) {
        setTechnicians(ur.data.filter(u => u.role === 'tecnico'));
        setSellers(ur.data.filter(u => u.role === 'vendedor'));
      }
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useSync(['orders','clients'], load);

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
    if (!form.client_id) return toast.error('Selecione um cliente');
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

  async function handleGeneratePDF(order) {
    try {
      // Busca dados do cliente para ter endereco completo
      const cr = await api.get('/clients/' + order.client_id).catch(() => ({ data: {} }));
      const merged = { ...order, ...cr.data, client_name: order.client_name, plan_name: order.plan_name, plan_speed: order.plan_speed, plan_price: order.plan_price, seller_name: order.seller_name, technician_name: order.technician_name };
      generateOrderPDF(merged);
    } catch { toast.error('Erro ao gerar PDF'); }
  }

  function sendWhatsAppsysflowcloudi(order) {
    const phone = '5543991599136';
    const data = order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('pt-BR') : 'A confirmar';
    const preco = order.plan_price ? `R$ ${parseFloat(order.plan_price).toFixed(2).replace('.',',')}` : '—';
    const lines = [
      '*📋 NOVA VENDA - SysFlowCloudi*',
      '',
      `*OS:* ${order.readable_id || order.os_number}`,
      `*Cliente:* ${order.client_name || '—'}`,
      `*CPF:* ${order.client_cpf || '—'}`,
      `*Telefone:* ${order.client_whatsapp || order.client_phone || '—'}`,
      `*Endereço:* ${order.client_address || '—'}`,
      '',
      `*Plano:* ${order.plan_name || '—'}`,
      `*Velocidade:* ${order.plan_speed || '—'}`,
      `*Valor:* ${preco}`,
      '',
      `*Data Instalação:* ${data}`,
      `*Técnico:* ${order.technician_name || 'A definir'}`,
      `*Vendedor:* ${order.seller_name || '—'}`,
      order.gold_fibra_id ? `*ID SysFlowCloudi:* ${order.gold_fibra_id}` : '',
      order.observations ? `*Observações:* ${order.observations}` : '',
    ].filter(Boolean).join('\n');
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(lines), '_blank');
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = o.os_number?.toLowerCase().includes(q)
      || o.readable_id?.toLowerCase().includes(q)
      || o.client_name?.toLowerCase().includes(q)
      || o.technician_name?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchTech   = !filterTech   || String(o.technician_id) === filterTech;
    const matchTipo   = !filterTipo   || o.tipo_ordem_servico === filterTipo;
    return matchSearch && matchStatus && matchTech && matchTipo;
  });

  return (
    <>
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
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="input w-auto">
          <option value="">Todos os tipos</option>
          {TIPO_OS_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {user.role === 'admin' && technicians.length > 0 && (
          <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="input w-auto">
            <option value="">Todos os técnicos</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {(filterStatus || filterTech || filterTipo || search) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterTech(''); setFilterTipo(''); }} className="btn-secondary text-sm">
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
          <div className="overflow-x-auto" style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header">ID Digitável</th>
                  <th className="table-header">Cliente</th>
                  <th className="table-header">Plano</th>
                  <th className="table-header">Técnico</th>
                  <th className="table-header">Agendamento</th>
                  <th className="table-header">Status OS</th>
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
                    <td className="table-cell">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => openView(o)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Detalhes">
                          <Eye className="w-4 h-4" />
                        </button>
                        {(user.role === 'admin' || user.role === 'tecnico') && (
                          <button onClick={() => openTransferModal(o)}
                            className="p-1.5 rounded-lg" style={{ color: '#60a5fa' }} title="Transferir / Manobrar OS">
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <>
                            <select onChange={e => e.target.value && updateStatus(o.id, e.target.value)} value=""
                              className="text-xs rounded px-1"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                              <option value="">Status</option>
                              {statusOpts.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                            </select>
                            <button onClick={() => setDeleteModal({ id: o.id, name: o.client_name })}
                              className="p-1.5 rounded-lg" style={{ color: '#ef4444' }} title="Deletar OS">
                              <Trash2 className="w-4 h-4" />
                            </button>
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


      {/* ── Pedido Criado Modal ── */}
      {modal === 'order_created' && lastOrder && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'#22c55e22'}}>
              <span style={{fontSize:'2rem'}}>✅</span>
            </div>
            <h2 className="text-xl font-black mb-1" style={{color:'var(--text-primary)'}}>Pedido Criado!</h2>
            <p className="text-sm mb-1" style={{color:'var(--text-muted)'}}>OS: <strong>{lastOrder.readable_id || lastOrder.os_number}</strong></p>
            <p className="text-sm mb-4" style={{color:'var(--text-muted)'}}>Cliente: <strong>{lastOrder.client_name}</strong></p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { generateOrderPDF(lastOrder); }} className="btn-secondary text-sm">
                📄 Baixar PDF novamente
              </button>
              <button onClick={() => {
                const phone = '55' + (lastOrder.client_whatsapp || '').replace(/\D/g,'');
                const msg = `*PEDIDO DE SERVIÇO - SysFlowCloudi*\n\nOlá *${lastOrder.client_name}*! 👋\n\nSeu pedido foi registrado com sucesso!\n\n*OS:* ${lastOrder.readable_id || lastOrder.os_number}\n*Plano:* ${lastOrder.plan_name || ''}\n*Data:* ${lastOrder.scheduled_date ? new Date(lastOrder.scheduled_date).toLocaleDateString('pt-BR') : 'A confirmar'}\n\nEm breve nossa equipe entrará em contato para agendar a instalação.\n\nAtenciosamente,\n*SysFlowCloudi*`;
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
              }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm" style={{background:'#25d366'}}>
                💬 Enviar confirmação via WhatsApp
              </button>
              <button onClick={() => sendWhatsAppsysflowcloudi(lastOrder)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
                style={{background:'#128C7E'}}>
                📤 Enviar para sysflowcloudi via WhatsApp
              </button>
              <button onClick={() => setModal(null)} className="text-sm" style={{color:'var(--text-muted)'}}>Fechar</button>
            </div>
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
                 <select value={form.client_id||''} onChange={e=>{const c=clients.find(x=>x.id==e.target.value);setForm(p=>({...p,client_id:e.target.value,plan_id:c?.plan_id||p.plan_id,seller_id:c?.seller_id||''}));}} className="input">
                   <option value="">Selecione o cliente</option>
                   {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.cpf}</option>)}
                 </select>
               </div>

               <div>
                 <label className="label">Tipo de Ordem de Serviço *</label>
                 <select value={form.tipo_ordem_servico||''} onChange={e => {
                   const nome = e.target.value;
                   const tipo = tiposOs.find(t => t.nome === nome);
                   setForm(p => ({ ...p, tipo_ordem_servico: nome, tipo_os_id: tipo?.id || null, valor_servico: tipo?.valor_padrao ?? valorPadrao[nome] ?? '' }));
                 }} className="input">
                   <option value="">Selecione o tipo</option>
                   {(tiposOs.length ? tiposOs : TIPO_OS_OPTS.map(n => ({ nome: n, valor_padrao: valorPadrao[n] }))).map(t => (
                     <option key={t.nome} value={t.nome}>{t.nome}</option>
                   ))}
                 </select>
               </div>

               {form.valor_servico !== '' && form.valor_servico != null && (
                 <div>
                   <label className="label">Valor do Serviço (R$) <span style={{color:'var(--text-muted)',fontWeight:'normal',fontSize:'0.75rem'}}>— preenchido automaticamente pelo tipo</span></label>
                   <input
                     type="text"
                     readOnly
                     value={`R$ ${Number(form.valor_servico).toFixed(2).replace('.',',')}`}
                     className="input"
                     style={{ color: '#10b981', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.85 }}
                   />
                 </div>
               )}







                <div><label className="label">Técnico</label>
                  <select value={form.technician_id||''} onChange={e=>setForm(p=>({...p,technician_id:e.target.value}))} className="input">
                    <option value="">Selecione o técnico</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.jd_id})</option>)}
                  </select>
                </div>

               {user.role === 'admin' && form.seller_id && (
                 <div><label className="label">Vendedor Responsável</label>
                   <input readOnly className="input"
                     style={{ color: '#818cf8', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.85 }}
                     value={sellers.find(s => s.id == form.seller_id)?.name + ' (' + sellers.find(s => s.id == form.seller_id)?.jd_id + ')' || ''} />
                 </div>
               )}

              <div><label className="label">Data de Instalação</label>
                <input type="date" value={form.scheduled_date||''} onChange={e=>setForm(p=>({...p,scheduled_date:e.target.value}))} className="input" />
              </div>
              <div>
                <label className="label">ID SysFlowCloudi <span style={{color:'var(--text-muted)',fontWeight:'normal',fontSize:'0.75rem'}}>(fornecido pela operadora)</span></label>
                <input value={form.gold_fibra_id||''} onChange={e=>setForm(p=>({...p,gold_fibra_id:e.target.value}))} className="input" placeholder="Ex: GF-2024-00123" />
              </div>
              {user.role === 'admin' && <div><label className="label">Observações</label>
                <textarea value={form.observations||''} onChange={e=>setForm(p=>({...p,observations:e.target.value}))} className="input h-20 resize-none" /></div>}
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
            {/* ── Painel Admin ── */}
            {user.role === 'admin' && (
              <div className="space-y-3 mb-4 p-4 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>⚙️ Painel Administrativo</p>
                <div className="p-3 rounded-xl" style={{ background: '#f59e0b11', border: '1px solid #f59e0b44' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>💬 Mensagem para o Vendedor</p>
                  <textarea
                    defaultValue={selected.admin_message||''}
                    id={`admin_msg_${selected.id}`}
                    rows={2}
                    className="input text-sm resize-none w-full mb-2"
                    placeholder="Mensagem visível no perfil do vendedor..." />
                  <button onClick={async () => {
                    const msg = document.getElementById(`admin_msg_${selected.id}`).value;
                    await api.put(`/orders/${selected.id}/seller-status`, { admin_message: msg });
                    toast.success('Mensagem salva!'); load();
                  }} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: '#f59e0b', color: '#000' }}>Salvar Mensagem</button>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>📋 Observações Internas</p>
                  <textarea
                    defaultValue={selected.observations||''}
                    id={`obs_${selected.id}`}
                    rows={2}
                    className="input text-sm resize-none w-full mb-2"
                    placeholder="Observações internas — não visíveis ao vendedor..." />
                  <button onClick={async () => {
                    const obs = document.getElementById(`obs_${selected.id}`).value;
                    await api.put(`/orders/${selected.id}/observations`, { observations: obs });
                    toast.success('Observações salvas!'); load();
                  }} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>Salvar Observações</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selected.tipo_ordem_servico && (
                <div className="col-span-2 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#818cf8' }}>Tipo de Serviço</p>
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{selected.tipo_ordem_servico}</p>
                </div>
              )}
              {/* Valor e pagamento do técnico */}
              {(selected.valor_servico != null || user.role === 'admin') && (
                <div className="col-span-2 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#10b981' }}>💰 Ganho do Técnico</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-2xl font-black" style={{ color: '#10b981' }}>
                        {selected.valor_servico != null ? `R$ ${Number(selected.valor_servico).toFixed(2).replace('.',',')}` : <span style={{color:'var(--text-muted)',fontSize:'1rem'}}>Sem valor definido</span>}
                      </p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                        style={{ background: selected.status_pagamento_tecnico === 'pago' ? '#22c55e22' : '#f59e0b22', color: selected.status_pagamento_tecnico === 'pago' ? '#22c55e' : '#f59e0b' }}>
                        {selected.status_pagamento_tecnico === 'pago' ? '✔ Pago' : '⏳ Pendente'}
                      </span>
                    </div>
                    {user.role === 'admin' && selected.status === 'finalizado' && (
                      <div className="flex flex-col gap-2">
                        {selected.status_pagamento_tecnico !== 'pago' && (
                          <button onClick={async () => { await api.put(`/orders/${selected.id}/payment`, { pay_tech: true }); toast.success('Técnico marcado como pago!'); load(); setModal(null); }}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold text-white" style={{ background: '#22c55e' }}>
                            ✔ Marcar como Pago
                          </button>
                        )}
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.01" min="0" defaultValue={selected.valor_servico || ''} id={`valor_${selected.id}`}
                            className="input text-sm w-28" placeholder="R$ valor" />
                          <button onClick={async () => {
                            const v = document.getElementById(`valor_${selected.id}`).value;
                            await api.put(`/orders/${selected.id}/valor-servico`, { valor_servico: v });
                            toast.success('Valor atualizado!'); load();
                          }} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                            Salvar Valor
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {[['Cliente', selected.client_name], ['Plano', `${selected.plan_name} — ${selected.plan_speed}`],
                ['Técnico', selected.technician_name || '—'], ['Vendedor', selected.seller_name || '—'],
                ['Agendamento', selected.scheduled_date ? new Date(selected.scheduled_date).toLocaleDateString('pt-BR') : '—'],
                ['Criado em', new Date(selected.created_at).toLocaleString('pt-BR')]].map(([l, v]) => (
                <div key={l}><p style={{ color: 'var(--text-muted)' }}>{l}</p><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{v}</p></div>
              ))}
              {selected.install_period && <div><p style={{ color: 'var(--text-muted)' }}>Turno</p><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{installPeriodLabel[selected.install_period]||selected.install_period}</p></div>}
              <div>
                <p style={{ color: 'var(--text-muted)' }}>Status da Venda</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: sellerStatusBg[selected.seller_status||'pendente'], color: sellerStatusColor[selected.seller_status||'pendente'] }}>
                  {sellerStatusLabel[selected.seller_status||'pendente']}
                </span>
              </div>
              {user.role === 'admin' && selected.observations && <div className="col-span-2"><p style={{ color: 'var(--text-muted)' }}>Observações</p><p style={{ color: 'var(--text-primary)' }}>{selected.observations}</p></div>}
              {selected.gold_fibra_id && (
                <div className="col-span-2 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>ID SysFlowCloudi (Operadora)</p>
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
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => sendWhatsAppsysflowcloudi(selected)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
                style={{background:'#128C7E'}}>
                📤 Enviar OS para sysflowcloudi via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    <AdminDeleteModal
      open={!!deleteModal}
      onClose={() => setDeleteModal(null)}
      onConfirmed={() => deleteOrder(deleteModal.id)}
      itemName={`OS de ${deleteModal?.name || 'cliente'}`}
    />
    </>
  );
}
