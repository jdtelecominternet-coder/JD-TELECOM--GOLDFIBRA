import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import api from '../services/api';
import { useSync } from '../hooks/useSync';
import toast from 'react-hot-toast';
import {
  TrendingUp, Users, ClipboardList, CheckCircle, Clock, DollarSign,
  Wifi, Award, Wrench, Truck, AlertCircle, RefreshCw, Banknote,
  ShoppingBag, CheckSquare, XCircle, User, Camera, UserX
} from 'lucide-react';

const fmtR$ = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const statusLabel = {
  pendente: 'Pendente', em_deslocamento: 'Deslocamento',
  em_execucao: 'Em Execução', finalizado: 'Finalizado', cancelado: 'Cancelado',
};

function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '22', color }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── PAINEL DO VENDEDOR ────────────────────────────────────────────────────────
function SellerPanel({ earnings }) {
  const [tab, setTab] = useState('a_receber');
  if (!earnings) return null;

  const os_list = earnings.os_list || [];
  const mensagens = os_list.filter(o => o.admin_message);
  const list = tab === 'a_receber'
    ? os_list.filter(o => o.seller_status === 'a_receber')
    : tab === 'ja_recebido'
    ? os_list.filter(o => o.seller_status === 'ja_recebido')
    : mensagens;

  const calcComm = (price) => earnings.commission_type === 'percent'
    ? ((price || 0) * (earnings.commission_value || 0) / 100)
    : (earnings.commission_value || 0);

  return (
    <div className="space-y-4">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total de OS</p>
          <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>{earnings.total_sales || 0}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.active_count || 0} finalizadas</p>
        </div>
        <div className="card text-center" style={{ border: '1px solid #3b82f644' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>A Receber</p>
          <p className="text-3xl font-black" style={{ color: '#3b82f6' }}>{fmtR$(earnings.comm_a_receber || 0)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.a_receber_count || 0} OS aguardando</p>
        </div>
        <div className="card text-center" style={{ border: '1px solid #22c55e44' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Já Recebido</p>
          <p className="text-3xl font-black" style={{ color: '#22c55e' }}>{fmtR$(earnings.comm_pago || 0)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.pago_count || 0} pagamento(s)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {[['a_receber','A Receber','#3b82f6'],['ja_recebido','Já Recebido','#22c55e'],['mensagens','Mensagens','#f59e0b']].map(([k,l,c]) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex-1 py-3 text-sm font-bold transition-colors relative"
              style={{ color: tab === k ? c : 'var(--text-muted)', borderBottom: tab === k ? `2px solid ${c}` : '2px solid transparent', background: 'transparent' }}>
              {l}
              {k === 'mensagens' && mensagens.length > 0 && (
                <span className="absolute top-1 right-2 text-xs font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#f59e0b', color: '#000', fontSize: '10px' }}>{mensagens.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {list.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              {tab === 'a_receber' ? 'Nenhuma comissão pendente.' : tab === 'ja_recebido' ? 'Nenhum recebimento registrado.' : 'Nenhuma mensagem do administrador.'}
            </p>
          ) : tab === 'mensagens' ? (
            <div className="space-y-3">
              {list.map(o => (
                <div key={o.id} className="p-3 rounded-xl" style={{ background: '#f59e0b15', border: '1px solid #f59e0b55' }}>
                  <p className="font-bold text-sm font-mono mb-1" style={{ color: '#f59e0b' }}>{o.readable_id || o.os_number} — {o.client_name}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{o.admin_message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{o.plan_name} · {o.tipo_ordem_servico || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {list.map(o => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm font-mono" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.plan_name} {o.finished_at ? `· Finalizado em ${new Date(o.finished_at).toLocaleDateString('pt-BR')}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-lg" style={{ color: tab === 'a_receber' ? '#3b82f6' : '#22c55e' }}>
                      {fmtR$(calcComm(o.plan_price))}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: tab === 'a_receber' ? '#3b82f622' : '#22c55e22', color: tab === 'a_receber' ? '#3b82f6' : '#22c55e' }}>
                      {tab === 'a_receber' ? '⏳ A Receber' : '✔ Recebido'}
                    </span>
                    {o.admin_message && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>"{o.admin_message}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
            ℹ️ Comissão liberada após instalação finalizada. Somente o admin confirma pagamento.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── PAINEL DO TÉCNICO ─────────────────────────────────────────────────────────
function TechPanel({ earnings }) {
  const [tab, setTab] = useState('a_receber');
  if (!earnings) return null;

  const os_list = earnings.os_list || [];
  const list = tab === 'a_receber'
    ? os_list.filter(o => !o.status_pagamento_tecnico || o.status_pagamento_tecnico === 'pendente')
    : os_list.filter(o => o.status_pagamento_tecnico === 'pago');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label="Instalações Finalizadas" value={earnings.installations || 0} />
        <StatCard icon={AlertCircle} label="A Receber" value={fmtR$(earnings.pendente_valor || 0)}
          sub={`${earnings.pendente_count || 0} OS aguardando`} color="#3b82f6" />
        <StatCard icon={CheckCircle} label="Já Recebido" value={fmtR$(earnings.pago_valor || 0)}
          sub={`${earnings.pago_count || 0} OS pagas`} color="#22c55e" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {[['a_receber','A Receber','#3b82f6'],['pago','Já Recebido','#22c55e']].map(([k,l,c]) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex-1 py-3 text-sm font-bold transition-colors"
              style={{ color: tab === k ? c : 'var(--text-muted)', borderBottom: tab === k ? `2px solid ${c}` : '2px solid transparent', background: 'transparent' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="p-4">
          {list.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              {tab === 'a_receber' ? 'Nenhum valor pendente.' : 'Nenhum pagamento recebido ainda.'}
            </p>
          ) : (
            <div className="space-y-2">
              {list.map(o => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm font-mono" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {o.tipo_ordem_servico || 'Instalação'}
                      {o.finished_at ? ` · ${new Date(o.finished_at).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-lg" style={{ color: tab === 'a_receber' ? '#3b82f6' : '#22c55e' }}>
                      {fmtR$(o.valor_servico)}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: tab === 'a_receber' ? '#3b82f622' : '#22c55e22', color: tab === 'a_receber' ? '#3b82f6' : '#22c55e' }}>
                      {tab === 'a_receber' ? '⏳ A Receber' : '✔ Recebido'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
            ℹ️ Pagamento liberado após finalização da OS. Somente o admin confirma recebimento.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── PAINEL FINANCEIRO ADMIN ───────────────────────────────────────────────────
function AdminFinancialPanel({ data, commCfg, onPaid }) {
  const [tab, setTab] = useState('vendedores');
  const [paying, setPaying] = useState({});

  const pendingSellers = data.pending_seller_payments || [];
  const pendingTechs   = data.pending_tech_payments || [];

  async function markSellerPaid(id) {
    setPaying(p => ({ ...p, [id]: true }));
    try {
      await api.put(`/orders/${id}/seller-status`, { seller_status: 'ja_recebido' });
      toast.success('Comissão do vendedor marcada como paga!');
      onPaid();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setPaying(p => ({ ...p, [id]: false })); }
  }

  async function markTechPaid(id) {
    setPaying(p => ({ ...p, [`t${id}`]: true }));
    try {
      await api.put(`/orders/${id}/pay-tech`);
      toast.success('Pagamento do técnico confirmado!');
      onPaid();
    } catch { toast.error('Erro ao atualizar'); }
    finally { setPaying(p => ({ ...p, [`t${id}`]: false })); }
  }

  const calcComm = (price) => commCfg?.type === 'percent'
    ? ((price || 0) * (commCfg.seller_value || 0) / 100)
    : (commCfg?.seller_value || 0);

  return (
    <div className="card">
      <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Banknote className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Painel Financeiro
      </h2>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Comissões a Pagar', value: data.financial.seller_a_receber_count, sub: fmtR$(data.financial.seller_a_receber_valor), color: '#3b82f6' },
          { label: 'Comissões Pagas',   value: data.financial.seller_pago_count,      sub: fmtR$(data.financial.seller_pago_valor),     color: '#22c55e' },
          { label: 'Técnicos a Pagar',  value: data.financial.tech_pendente_count,    sub: fmtR$(data.financial.tech_pendente_valor),   color: '#f59e0b' },
          { label: 'Técnicos Pagos',    value: data.financial.tech_pago_count,        sub: fmtR$(data.financial.tech_pago_valor),       color: '#22c55e' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: color + '15', border: `1px solid ${color}44` }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs detalhes */}
      <div className="flex gap-2 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
        {[['vendedores','Comissões Vendedores','#3b82f6'],['tecnicos','Pagamentos Técnicos','#f59e0b']].map(([k,l,c]) => (
          <button key={k} onClick={() => setTab(k)}
            className="pb-2 px-3 text-sm font-bold"
            style={{ color: tab === k ? c : 'var(--text-muted)', borderBottom: tab === k ? `2px solid ${c}` : '2px solid transparent', background: 'transparent' }}>
            {l} {tab !== k && <span className="ml-1 text-xs rounded-full px-1.5 py-0.5" style={{ background: c + '22', color: c }}>
              {k === 'vendedores' ? pendingSellers.length : pendingTechs.length}
            </span>}
          </button>
        ))}
      </div>

      {tab === 'vendedores' ? (
        pendingSellers.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>✔ Todas as comissões estão em dia.</p>
        ) : (
          <div className="space-y-2">
            {pendingSellers.map(o => (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl flex-wrap"
                style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="flex-1 min-w-40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#3b82f622', color: '#3b82f6' }}>
                      <ShoppingBag className="w-3 h-3" /> {o.seller_name}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.plan_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{ color: '#3b82f6' }}>{fmtR$(calcComm(o.plan_price))}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>comissão</p>
                </div>
                <button
                  onClick={() => markSellerPaid(o.id)}
                  disabled={paying[o.id]}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0"
                  style={{ background: '#22c55e', color: '#fff', opacity: paying[o.id] ? 0.6 : 1 }}>
                  {paying[o.id]
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><CheckSquare className="w-4 h-4" /> Marcar como Pago</>}
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        pendingTechs.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>✔ Todos os técnicos estão pagos.</p>
        ) : (
          <div className="space-y-2">
            {pendingTechs.map(o => (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl flex-wrap"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex-1 min-w-40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                      <Wrench className="w-3 h-3" /> {o.tech_name || 'Sem técnico'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.tipo_ordem_servico || 'Instalação'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{ color: '#f59e0b' }}>{fmtR$(o.valor_servico)}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>a pagar</p>
                </div>
                <button
                  onClick={() => markTechPaid(o.id)}
                  disabled={paying[`t${o.id}`]}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0"
                  style={{ background: '#22c55e', color: '#fff', opacity: paying[`t${o.id}`] ? 0.6 : 1 }}>
                  {paying[`t${o.id}`]
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><CheckSquare className="w-4 h-4" /> Marcar como Pago</>}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Ganhos por tipo de OS */}
      {data.financial.por_tipo?.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Ganhos por Tipo de Serviço</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {data.financial.por_tipo.map(t => (
              <div key={t.tipo} className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-medium truncate mr-2" style={{ color: '#818cf8' }}>{t.tipo}</span>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black" style={{ color: '#10b981' }}>{fmtR$(t.total)}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.qtd} OS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD PRINCIPAL ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const chatCtx = useChat();
  const [data, setData] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Localização em tempo real dos técnicos { [user_id]: { latitude, longitude, geo_address, ts } }
  const [techLocations, setTechLocations] = useState({});

  // Escuta eventos de localização em tempo real
  useEffect(() => {
    const socket = chatCtx?.socket;
    if (!socket || user.role !== 'admin') return;
    const onLocation = (data) => {
      setTechLocations(prev => ({ ...prev, [data.user_id]: data }));
    };
    const onOffline = (data) => {
      setTechLocations(prev => { const n = { ...prev }; delete n[data.user_id]; return n; });
    };
    socket.on('tech:location_update', onLocation);
    socket.on('tech:offline', onOffline);
    return () => { socket.off('tech:location_update', onLocation); socket.off('tech:offline', onOffline); };
  }, [chatCtx?.socket, user.role]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reqs = [];
      if (user.role === 'admin') reqs.push(api.get('/settings/dashboard'));
      if (['vendedor', 'tecnico'].includes(user.role)) reqs.push(api.get('/settings/my-earnings'));
      const [res1] = await Promise.all(reqs);
      if (user.role === 'admin' && res1) setData(res1.data);
      if (['vendedor', 'tecnico'].includes(user.role) && res1) setEarnings(res1.data);
    } catch {} finally { setLoading(false); }
  }, [user.role]);

  useEffect(() => { 
    load(); 
    // Atualizar a cada 30 segundos para garantir dados atualizados
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);
  useSync('orders', load);

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const r = await api.post('/users/me/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ photo_url: r.data.photo_url });
      toast.success('Foto atualizada!');
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploading(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          {['vendedor', 'tecnico'].includes(user.role) && (
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                style={{ background: 'var(--bg-input)', border: '2px solid var(--border)' }}>
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                ) : user.photo_url ? (
                  <img src={user.photo_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: 'var(--accent)' }} title="Alterar foto de perfil">
                <Camera className="w-3 h-3" style={{ color: 'var(--bg-main)' }} />
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
              </label>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              Olá, <span style={{ color: 'var(--accent)' }}>{user.name.split(' ')[0]}</span>!
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Bem-vindo ao SysFlowCloudi</p>
          </div>
        </div>
        <button onClick={load} className="btn-secondary p-2" title="Atualizar dashboard">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── ADMIN ── */}
      {user.role === 'admin' && data && (
        <>
          {/* Métricas gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard icon={Users}         label="Total de Clientes"   value={data.clients.total} />
            <StatCard icon={CheckCircle}   label="Clientes Ativos"     value={data.clients.active}  color="#22c55e" />
            <StatCard icon={Clock}         label="OS Pendentes"        value={data.orders.pending}  color="#f59e0b" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={ClipboardList} label="Total de OS"         value={data.orders.total} />
            <StatCard icon={TrendingUp}    label="Instalações Feitas"  value={data.orders.finished} color="#22c55e" />
            <StatCard icon={Wifi}          label="Equipe Ativa"        value={`${data.team.sellers}V / ${data.team.technicians}T`} />
          </div>

          {/* Painel financeiro com botões Marcar como Pago */}
          {data.financial && (
            <AdminFinancialPanel
              data={data}
              commCfg={data.commission_config}
              onPaid={load}
            />
          )}

          {/* Status técnicos em tempo real */}
          {data.tech_operational?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Truck className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Status dos Técnicos em Tempo Real
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.tech_operational.map(t => {
                  const isRede = t.role === 'manutencao';
                  const s = isRede ? t.rede_status : t.current_status;

                  // Se não está online, mostra Offline independente do status
                  const badge = !t.online
                    ? { label: 'Offline', color: '#94a3b8', Icon: UserX }
                    : s === 'em_deslocamento' || s === 'aguardando' ? { label: 'Em Deslocamento', color: '#f59e0b', Icon: Truck }
                    : s === 'em_andamento' || s === 'em_execucao' ? { label: 'Em Andamento', color: '#3b82f6', Icon: Wrench }
                    : { label: 'Disponível', color: '#22c55e', Icon: CheckCircle };

                  return (
                    <div key={t.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      onClick={() => {
                        // Prioriza localização em tempo real, depois banco de dados
                        const live = techLocations[t.id];
                        const lat = live?.latitude ?? t.latitude;
                        const lng = live?.longitude ?? t.longitude;
                        const addr = live?.geo_address ?? t.geo_address;
                        if (lat && lng) {
                          window.open(`https://www.google.com/maps?q=${lat},${lng}&z=17&hl=pt-BR`, '_blank');
                        } else if (addr) {
                          window.open(`https://www.google.com/maps/search/${encodeURIComponent(addr)}`, '_blank');
                        }
                      }}
                      style={{
                        background: 'var(--bg-input)',
                        border: `1px solid ${badge.color}44`,
                        opacity: t.online ? 1 : 0.6,
                        cursor: (techLocations[t.id] || t.latitude || t.geo_address) ? 'pointer' : 'default',
                        transition: 'box-shadow 0.15s',
                      }}
                      title={(techLocations[t.id] || t.latitude || t.geo_address) ? `Ver localização de ${t.name} no mapa` : ''}
                      onMouseEnter={e => { if (techLocations[t.id] || t.latitude || t.geo_address) e.currentTarget.style.boxShadow = `0 0 0 2px ${badge.color}88`; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 relative"
                        style={{ background: badge.color + '20' }}>
                        <badge.Icon className="w-4 h-4" style={{ color: badge.color }} />
                        {/* Indicador online/offline */}
                        <span style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 10, height: 10, borderRadius: '50%',
                          background: t.online ? '#22c55e' : '#94a3b8',
                          border: '2px solid var(--bg-input)'
                        }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                          {isRede && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: '#7c3aed20', color: '#a78bfa', fontSize: 10 }}>🌐 Rede</span>}
                        </div>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.jd_id}</p>
                        <p className="text-xs font-semibold" style={{ color: badge.color }}>{badge.label}</p>
                        {t.online && isRede && t.rede_cto && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>📡 CTO {t.rede_cto} — {t.rede_readable_id}</p>}
                        {t.online && !isRede && t.current_client && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>📍 {t.current_client}</p>}
                        {techLocations[t.id] && (
                          <p className="text-xs font-semibold mt-0.5" style={{ color: '#22c55e' }}>📡 Ao vivo — Ver no mapa</p>
                        )}
                        {!techLocations[t.id] && (t.latitude || t.geo_address) && (
                          <p className="text-xs font-semibold mt-0.5" style={{ color: '#60a5fa' }}>🗺️ Última localização</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Últimas OS */}
          {data.recent_orders?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Últimas OS</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header">OS</th>
                    <th className="table-header">Cliente</th>
                    <th className="table-header">Técnico</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Data</th>
                  </tr></thead>
                  <tbody>
                    {data.recent_orders.map(o => (
                      <tr key={o.os_number} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="table-cell font-mono font-bold" style={{ color: 'var(--accent)' }}>{o.os_number}</td>
                        <td className="table-cell" style={{ color: 'var(--text-primary)' }}>{o.client_name}</td>
                        <td className="table-cell">{o.tech_name || '—'}</td>
                        <td className="table-cell"><span className={`badge-${o.status}`}>{statusLabel[o.status]}</span></td>
                        <td className="table-cell">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VENDEDOR ── */}
      {user.role === 'vendedor' && (
        <>
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <ShoppingBag className="w-6 h-6 flex-shrink-0" style={{ color: '#818cf8' }} />
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Painel do Vendedor</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Acompanhe suas OS e comissões. Pagamentos são confirmados pelo administrador.</p>
            </div>
          </div>
          <SellerPanel earnings={earnings} />
        </>
      )}

      {/* ── TÉCNICO ── */}
      {user.role === 'tecnico' && (
        <>
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Wrench className="w-6 h-6 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Painel do Técnico</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Suas instalações finalizadas e status de pagamento. Acesse o Módulo Técnico para gerenciar OS.</p>
            </div>
          </div>
          <TechPanel earnings={earnings} />
        </>
      )}
    </div>
  );
}
