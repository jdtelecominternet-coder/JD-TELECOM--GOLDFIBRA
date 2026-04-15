import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { TrendingUp, Users, ClipboardList, CheckCircle, Clock, DollarSign, Wifi, Award, Wrench, Truck, AlertCircle, RefreshCw, Banknote } from 'lucide-react';

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

const statusLabel = { pendente:'Pendente', em_deslocamento:'Deslocamento', em_execucao:'Em Execução', finalizado:'Finalizado', cancelado:'Cancelado', ativo:'Ativo' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reqs = [api.get('/users/me/stats')];
    if (user.role === 'admin') reqs.push(api.get('/settings/dashboard'));
    if (['vendedor','tecnico'].includes(user.role)) reqs.push(api.get('/settings/my-earnings'));

    Promise.all(reqs).then(([statsRes, secRes]) => {
      setMyStats(statsRes.data);
      if (user.role === 'admin' && secRes) setData(secRes.data);
      if (['vendedor','tecnico'].includes(user.role) && secRes) setEarnings(secRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function refreshDashboard() {
    setLoading(true);
    const reqs = [api.get('/users/me/stats')];
    if (user.role === 'admin') reqs.push(api.get('/settings/dashboard'));
    if (['vendedor','tecnico'].includes(user.role)) reqs.push(api.get('/settings/my-earnings'));
    Promise.all(reqs).then(([statsRes, secRes]) => {
      setMyStats(statsRes.data);
      if (user.role === 'admin' && secRes) setData(secRes.data);
      if (['vendedor','tecnico'].includes(user.role) && secRes) setEarnings(secRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const fmtR$ = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Olá, <span style={{ color: 'var(--accent)' }}>{user.name.split(' ')[0]}</span>!
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Bem-vindo ao JD TELECOM - GOLD FIBRA</p>
        </div>
        <button onClick={refreshDashboard} className="btn-secondary p-2" title="Atualizar dashboard">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── ADMIN ── */}
      {user.role === 'admin' && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Total de Clientes"   value={data.clients.total} />
            <StatCard icon={CheckCircle} label="Clientes Ativos"     value={data.clients.active}   color="#22c55e" />
            <StatCard icon={Clock}       label="OS Pendentes"        value={data.orders.pending}    color="#f59e0b" />
            <StatCard icon={DollarSign}  label="Receita Mensal"      value={fmtR$(data.monthly_revenue)} color="#10b981" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={ClipboardList} label="Total de OS"        value={data.orders.total} />
            <StatCard icon={TrendingUp}    label="Instalações Feitas" value={data.orders.finished} color="#22c55e" />
            <StatCard icon={Wifi}          label="Equipe Ativa"       value={`${data.team.sellers}V / ${data.team.technicians}T`} />
          </div>

          {/* ── PAINEL FINANCEIRO ── */}
          {data.financial && (
            <div className="card">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Banknote className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Painel Financeiro
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Comissões a Pagar', value: data.financial.seller_a_receber_count, sub: fmtR$(data.financial.seller_a_receber_valor), color: '#f59e0b' },
                  { label: 'Comissões Pagas', value: data.financial.seller_pago_count, sub: fmtR$(data.financial.seller_pago_valor), color: '#22c55e' },
                  { label: 'Técnicos a Pagar', value: data.financial.tech_pendente_count, sub: 'instalações pendentes', color: '#f59e0b' },
                  { label: 'Técnicos Pagos', value: data.financial.tech_pago_count, sub: 'instalações pagas', color: '#22c55e' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: color + '15', border: `1px solid ${color}44` }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-2xl font-black" style={{ color }}>{value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STATUS TÉCNICOS EM TEMPO REAL ── */}
          {data.tech_operational?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Truck className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Status dos Técnicos em Tempo Real
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.tech_operational.map(t => {
                  const s = t.current_status;
                  const badge = s === 'em_deslocamento' ? { label: 'Em Deslocamento', color: '#f59e0b', icon: Truck }
                    : s === 'em_execucao' ? { label: 'Em Andamento', color: '#3b82f6', icon: Wrench }
                    : { label: 'Disponível', color: '#22c55e', icon: CheckCircle };
                  const Icon = badge.icon;
                  return (
                    <div key={t.id} className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: 'var(--bg-input)', border: `1px solid ${badge.color}44` }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: badge.color + '20' }}>
                        <Icon className="w-4 h-4" style={{ color: badge.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.jd_id}</p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: badge.color }}>{badge.label}</p>
                        {t.current_client && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>📍 {t.current_client}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seller commissions table */}
          {data.seller_stats?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Award className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Comissões — Vendedores
                <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
                  ({data.commission_config?.type === 'percent' ? `${data.commission_config.seller_value}% sobre venda` : `R$ ${data.commission_config?.seller_value} por venda`})
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header">Vendedor</th>
                    <th className="table-header">Vendas</th>
                    <th className="table-header">Receita</th>
                    <th className="table-header">Comissão</th>
                  </tr></thead>
                  <tbody>
                    {data.seller_stats.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="table-cell"><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p><p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.jd_id}</p></td>
                        <td className="table-cell">{s.sales}</td>
                        <td className="table-cell">{fmtR$(s.revenue)}</td>
                        <td className="table-cell font-bold" style={{ color: '#22c55e' }}>{fmtR$(s.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tech earnings table */}
          {data.tech_stats?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Wrench className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Ganhos — Técnicos
                <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>(R$ {data.commission_config?.tech_value} por instalação)</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header">Técnico</th>
                    <th className="table-header">Instalações</th>
                    <th className="table-header">Ganho Total</th>
                  </tr></thead>
                  <tbody>
                    {data.tech_stats.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="table-cell"><p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p><p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.jd_id}</p></td>
                        <td className="table-cell">{t.installations}</td>
                        <td className="table-cell font-bold" style={{ color: '#22c55e' }}>{fmtR$(t.earnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent OS */}
          {data.recent_orders?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Últimas OS</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header">OS</th><th className="table-header">Cliente</th>
                    <th className="table-header">Técnico</th><th className="table-header">Status</th>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Meus Clientes"   value={myStats?.clients?.length || 0} />
            <StatCard icon={CheckCircle} label="Clientes Ativos" value={myStats?.clients?.filter(c=>c.status==='ativo').length || 0} color="#22c55e" />
            <StatCard icon={DollarSign}  label="Receita Gerada"  value={fmtR$(earnings?.total_revenue)} color="#10b981" />
            <StatCard icon={Award}       label="Minha Comissão"  value={fmtR$(earnings?.commission)} color="#f59e0b"
              sub={earnings?.commission_type === 'percent' ? `${earnings?.commission_value}% sobre vendas` : `R$ ${earnings?.commission_value} por venda`} />
          </div>

          {/* Painel de Pagamentos do Vendedor */}
          {earnings && (
            <div className="card">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Banknote className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Meus Pagamentos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 text-center" style={{ background: '#f59e0b15', border: '1px solid #f59e0b44' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>A Receber</p>
                  <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>{fmtR$(earnings.comm_a_receber)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.a_receber_count || 0} instalação(ões) concluída(s)</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: '#22c55e15', border: '1px solid #22c55e44' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Já Recebido</p>
                  <p className="text-2xl font-black" style={{ color: '#22c55e' }}>{fmtR$(earnings.comm_pago)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.pago_count || 0} pagamento(s) confirmado(s)</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Comissão</p>
                  <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{fmtR$(earnings.commission)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>sobre {fmtR$(earnings.total_revenue)} em vendas</p>
                </div>
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                ℹ️ Status atualizado automaticamente pelo sistema. Apenas administrador pode confirmar pagamentos.
              </p>
            </div>
          )}
          {myStats?.orders?.length > 0 && (
            <div className="card">
              <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Minhas OS Recentes</h2>
              <div className="space-y-2">
                {myStats.orders.slice(0,5).map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{o.client_name}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{o.os_number}</p></div>
                    <span className={`badge-${o.status}`}>{statusLabel[o.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TÉCNICO ── */}
      {user.role === 'tecnico' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={ClipboardList} label="Total de OS"      value={myStats?.orders?.length || 0} />
            <StatCard icon={CheckCircle}   label="Finalizadas"      value={myStats?.orders?.filter(o=>o.status==='finalizado').length || 0} color="#22c55e" />
            <StatCard icon={DollarSign}    label="Meus Ganhos"      value={fmtR$(earnings?.earnings)}
              sub={`${earnings?.installations || 0} instalações × R$ ${earnings?.tech_value || 0}`} color="#10b981" />
          </div>
          <div className="card">
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
              Acesse o <strong style={{ color: 'var(--accent)' }}>Módulo Técnico</strong> para gerenciar suas ordens de serviço e registrar instalações.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
