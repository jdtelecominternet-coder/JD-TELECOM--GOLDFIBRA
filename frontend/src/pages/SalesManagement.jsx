import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RefreshCw, Search, Send, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';

// ── Status de pagamento do vendedor ──────────────────────────────────────────
const sellerStatusCfg = {
  pendente:    { label: 'Pendente',    color: '#f97316', bg: '#f9731622', icon: Clock },
  a_receber:   { label: 'A Receber',   color: '#3b82f6', bg: '#3b82f622', icon: AlertCircle },
  ja_recebido: { label: 'Já Recebido', color: '#22c55e', bg: '#22c55e22', icon: CheckCircle },
  cancelado:   { label: 'Cancelado',   color: '#ef4444', bg: '#ef444422', icon: XCircle },
};

const installStatusLabel = { pendente:'Agendado', em_deslocamento:'Em andamento', em_execucao:'Em andamento', finalizado:'Concluído', cancelado:'Cancelado' };
const installStatusColor = { pendente:'#3b82f6', em_deslocamento:'#f97316', em_execucao:'#f97316', finalizado:'#22c55e', cancelado:'#ef4444' };
const installStatusBg    = { pendente:'#3b82f622', em_deslocamento:'#f9731622', em_execucao:'#f9731622', finalizado:'#22c55e22', cancelado:'#ef444422' };

function SellerStatusBadge({ s }) {
  const cfg = sellerStatusCfg[s || 'pendente'] || sellerStatusCfg.pendente;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function InstallBadge({ s }) {
  const st = s || 'pendente';
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: installStatusBg[st] || '#3b82f622', color: installStatusColor[st] || '#3b82f6' }}>
      {installStatusLabel[st] || 'Agendado'}
    </span>
  );
}

export default function SalesManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState('all');
  const [saving, setSaving]   = useState({});
  // Mensagens controladas por estado (corrige problema de defaultValue não atualizar)
  const [msgs, setMsgs]       = useState({});

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/orders');
      setOrders(r.data);
      // Pré-carrega as mensagens no estado controlado
      const m = {};
      r.data.forEach(o => { m[o.id] = o.admin_message || ''; });
      setMsgs(m);
    } catch { toast.error('Erro ao carregar vendas'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useSync('orders', load);

  async function updateStatus(id, seller_status) {
    if (!isAdmin) return;
    setSaving(p => ({ ...p, [`s_${id}`]: true }));
    try {
      await api.put(`/orders/${id}/seller-status`, { seller_status });
      // Atualiza local com comparação loose (== evita problema de tipo string/number)
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, seller_status } : o));
      toast.success('Status atualizado!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setSaving(p => ({ ...p, [`s_${id}`]: false }));
    }
  }

  async function updateTechStatus(id, status_pagamento_tecnico) {
    if (!isAdmin) return;
    setSaving(p => ({ ...p, [`t_${id}`]: true }));
    try {
      await api.put(`/orders/${id}/pay-tech`, { status_pagamento_tecnico });
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, status_pagamento_tecnico } : o));
      toast.success('Pagamento do técnico atualizado!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao atualizar técnico');
    } finally {
      setSaving(p => ({ ...p, [`t_${id}`]: false }));
    }
  }

  async function saveMsg(id) {
    if (!isAdmin) return;
    const msg = msgs[id] ?? '';
    setSaving(p => ({ ...p, [`m_${id}`]: true }));
    try {
      await api.put(`/orders/${id}/seller-status`, { admin_message: msg });
      setOrders(prev => prev.map(o => String(o.id) === String(id) ? { ...o, admin_message: msg } : o));
      toast.success('Mensagem enviada ao vendedor!');
    } catch {
      toast.error('Erro ao salvar mensagem');
    } finally {
      setSaving(p => ({ ...p, [`m_${id}`]: false }));
    }
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.client_name?.toLowerCase().includes(q)
      || o.seller_name?.toLowerCase().includes(q)
      || o.readable_id?.toLowerCase().includes(q)
      || o.plan_name?.toLowerCase().includes(q);
  });

  // Agrupamento por vendedor
  const byVendor = filtered.reduce((acc, o) => {
    const key = o.seller_name || 'Sem vendedor';
    if (!acc[key]) acc[key] = { name: key, jd_id: o.seller_jd_id, orders: [] };
    acc[key].orders.push(o);
    return acc;
  }, {});

  const totalGeral = filtered.reduce((s, o) => s + (parseFloat(o.plan_price) || 0), 0);
  const tabs = isAdmin
    ? [['all','Todas as Vendas'],['byvendor','Por Vendedor'],['installations','Gestão de Instalações']]
    : [['all','Minhas Vendas'],['installations','Minhas Instalações']];

  // Card de venda (aba 'all')
  function CardVenda({ o }) {
    const sellerStatus = o.seller_status || 'pendente';
    return (
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-start">
          {/* Info */}
          <div className="flex-1 min-w-48">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm font-mono" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</span>
              <SellerStatusBadge s={sellerStatus} />
              {o.tipo_ordem_servico && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                  {o.tipo_ordem_servico}
                </span>
              )}
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {o.plan_name}{o.plan_speed ? ` — ${o.plan_speed}` : ''}{o.plan_price ? ` — R$ ${parseFloat(o.plan_price).toFixed(2).replace('.', ',')}` : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {isAdmin && <>Vendedor: <strong>{o.seller_name || '—'}</strong></>}
              {o.scheduled_date ? ` · ${new Date(o.scheduled_date).toLocaleDateString('pt-BR')}` : ''}
            </p>
            <div className="mt-1"><InstallBadge s={o.status} /></div>
          </div>

          {/* Status recebimento */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Status de Recebimento</p>
            {isAdmin ? (
              <div className="flex gap-1 flex-wrap">
                {Object.entries(sellerStatusCfg).map(([s, cfg]) => {
                  const Icon = cfg.icon;
                  const active = sellerStatus === s;
                  const isSaving = saving[`s_${o.id}`];
                  return (
                    <button key={s}
                      onClick={() => updateStatus(o.id, s)}
                      disabled={isSaving}
                      title={cfg.label}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold transition-all"
                      style={{
                        background: active ? cfg.color : cfg.bg,
                        color: active ? '#fff' : cfg.color,
                        border: `1px solid ${cfg.color}`,
                        opacity: isSaving ? 0.6 : 1,
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                      }}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <SellerStatusBadge s={sellerStatus} />
                {(sellerStatus === 'pendente') && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Aguardando instalação</p>}
                {sellerStatus === 'a_receber'  && <p className="text-xs mt-1" style={{ color: '#3b82f6' }}>Instalação concluída — aguardando pagamento</p>}
                {sellerStatus === 'ja_recebido'&& <p className="text-xs mt-1" style={{ color: '#22c55e' }}>Comissão confirmada pelo administrador ✔</p>}
              </div>
            )}
          </div>

          {/* Mensagem */}
          {isAdmin ? (
            <div className="flex-1 min-w-52">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Mensagem ao Vendedor</p>
              <div className="flex gap-2">
                <textarea
                  value={msgs[o.id] ?? ''}
                  onChange={e => setMsgs(p => ({ ...p, [o.id]: e.target.value }))}
                  rows={2}
                  className="input text-xs resize-none flex-1"
                  placeholder="Ex: Pagamento confirmado..." />
                <button onClick={() => saveMsg(o.id)}
                  disabled={saving[`m_${o.id}`]}
                  className="p-2 rounded-xl flex-shrink-0 self-stretch flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  {saving[`m_${o.id}`]
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : o.admin_message ? (
            <div className="flex-1 min-w-40 rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#60a5fa' }}>Mensagem do Administrador</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{o.admin_message}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <DollarSign className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            {isAdmin ? 'Gestão de Vendas' : 'Minhas Vendas'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} venda(s) — Total: R$ {totalGeral.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <button onClick={load} className="btn-secondary p-2" title="Atualizar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, vendedor, ID ou plano..." className="input pl-9" />
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Status:</span>
        {Object.entries(sellerStatusCfg).map(([k, cfg]) => {
          const Icon = cfg.icon;
          return (
            <span key={k} className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="pb-2 px-3 text-sm font-semibold transition-colors"
            style={{ color: tab === k ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === k ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : tab === 'all' ? (
        <div className="space-y-3">
          {filtered.length === 0 && <div className="card text-center py-10" style={{ color: 'var(--text-muted)' }}>Nenhuma venda encontrada</div>}
          {filtered.map(o => <CardVenda key={o.id} o={o} />)}
        </div>

      ) : tab === 'byvendor' ? (
        <div className="space-y-4">
          {Object.entries(byVendor).map(([name, vendor]) => {
            const vTotal    = vendor.orders.reduce((s, o) => s + (parseFloat(o.plan_price) || 0), 0);
            const vRecebido = vendor.orders.filter(o => o.seller_status === 'ja_recebido').length;
            const vAReceber = vendor.orders.filter(o => o.seller_status === 'a_receber').length;
            const vPend     = vendor.orders.filter(o => !o.seller_status || o.seller_status === 'pendente').length;
            const vCanc     = vendor.orders.filter(o => o.seller_status === 'cancelado').length;
            return (
              <div key={name} className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 flex-wrap gap-3"
                  style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                    {vendor.jd_id && <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{vendor.jd_id}</p>}
                  </div>
                  <div className="flex gap-3 flex-wrap text-center">
                    {[['Vendas', vendor.orders.length, 'var(--text-primary)'],['Total', `R$ ${vTotal.toFixed(2).replace('.',',')}`, 'var(--accent)'],['Recebido', vRecebido, '#22c55e'],['A Receber', vAReceber, '#3b82f6'],['Pendente', vPend, '#f97316'],['Cancelado', vCanc, '#ef4444']].map(([l,v,c]) => (
                      <div key={l}><p className="text-lg font-black" style={{ color: c }}>{v}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</p></div>
                    ))}
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {vendor.orders.map(o => (
                    <div key={o.id} className="flex items-center gap-3 px-4 py-2 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent)', minWidth: 90 }}>{o.readable_id || o.os_number}</span>
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{o.client_name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.plan_name}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {o.plan_price ? `R$ ${parseFloat(o.plan_price).toFixed(2).replace('.', ',')}` : '—'}
                      </span>
                      <SellerStatusBadge s={o.seller_status} />
                      {isAdmin && (
                        <div className="flex gap-1">
                          {Object.entries(sellerStatusCfg).map(([s, cfg]) => {
                            const Icon = cfg.icon;
                            const active = (o.seller_status || 'pendente') === s;
                            return (
                              <button key={s} onClick={() => updateStatus(o.id, s)}
                                disabled={saving[`s_${o.id}`]}
                                title={cfg.label}
                                className="p-1 rounded-lg text-xs transition-all"
                                style={{ background: active ? cfg.color : cfg.bg, color: active ? '#fff' : cfg.color, border: `1px solid ${cfg.color}` }}>
                                <Icon className="w-3 h-3" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(byVendor).length === 0 && <div className="card text-center py-10" style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado</div>}
        </div>

      ) : (
        /* Gestão de Instalações */
        <div className="space-y-3">
          {filtered.length === 0 && <div className="card text-center py-10" style={{ color: 'var(--text-muted)' }}>Nenhuma instalação encontrada</div>}
          {filtered.map(o => {
            const sellerStatus = o.seller_status || 'pendente';
            return (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-48">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm font-mono" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</span>
                      {o.gold_fibra_id && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#f59e0b22', color: '#f59e0b' }}>ID sysflowcloudi: {o.gold_fibra_id}</span>}
                      <InstallBadge s={o.status} />
                      <SellerStatusBadge s={sellerStatus} />
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isAdmin && <>Técnico: {o.technician_name || 'sem técnico'}</>}
                      {o.install_period ? ` · ${o.install_period === 'manha' ? 'Manhã' : 'Tarde'}` : ''}
                      {o.scheduled_date ? ` · ${new Date(o.scheduled_date).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                    {isAdmin && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vendedor: <strong>{o.seller_name || '—'}</strong></p>}
                  </div>

                  {/* Status recebimento na aba instalações */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Recebimento</p>
                    {isAdmin ? (
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(sellerStatusCfg).map(([s, cfg]) => {
                          const Icon = cfg.icon;
                          const active = sellerStatus === s;
                          return (
                            <button key={s}
                              onClick={() => updateStatus(o.id, s)}
                              disabled={saving[`s_${o.id}`]}
                              title={cfg.label}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold transition-all"
                              style={{
                                background: active ? cfg.color : cfg.bg,
                                color: active ? '#fff' : cfg.color,
                                border: `1px solid ${cfg.color}`,
                                opacity: saving[`s_${o.id}`] ? 0.6 : 1
                              }}>
                              <Icon className="w-3 h-3" /> {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <SellerStatusBadge s={sellerStatus} />
                    )}
                  </div>

                  {/* Pagamento Técnico — só admin, só se tem técnico */}
                  {isAdmin && o.technician_id && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Pagamento Técnico</p>
                      <div className="flex gap-1">
                        {[
                          { s: 'pendente', label: 'A Pagar', color: '#f59e0b', bg: '#f59e0b22' },
                          { s: 'pago',     label: 'Pago',    color: '#22c55e', bg: '#22c55e22' },
                        ].map(({ s, label, color, bg }) => {
                          const techStatus = o.status_pagamento_tecnico || 'pendente';
                          const active = techStatus === s;
                          return (
                            <button key={s}
                              onClick={() => updateTechStatus(o.id, s)}
                              disabled={saving[`t_${o.id}`]}
                              className="text-xs px-3 py-1 rounded-lg font-bold transition-all"
                              style={{ background: active ? color : bg, color: active ? '#fff' : color, border: `1px solid ${color}`, opacity: saving[`t_${o.id}`] ? 0.6 : 1 }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {o.technician_name && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Técnico: {o.technician_name}</p>
                      )}
                    </div>
                  )}

                  {/* Mensagem — só admin */}
                  {isAdmin && (
                    <div className="flex-1 min-w-52">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Mensagem ao Vendedor</p>
                      <div className="flex gap-2">
                        <textarea
                          value={msgs[o.id] ?? ''}
                          onChange={e => setMsgs(p => ({ ...p, [o.id]: e.target.value }))}
                          rows={2}
                          className="input text-xs resize-none flex-1"
                          placeholder="Ex: Pagamento confirmado..." />
                        <button onClick={() => saveMsg(o.id)}
                          disabled={saving[`m_${o.id}`]}
                          className="p-2 rounded-xl flex-shrink-0 self-stretch flex items-center justify-center"
                          style={{ background: 'var(--accent)', color: '#fff' }}>
                          {saving[`m_${o.id}`]
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Vendedor vê mensagem do admin */}
                  {!isAdmin && o.admin_message && (
                    <div className="flex-1 min-w-40 rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#60a5fa' }}>Mensagem do Administrador</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{o.admin_message}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
