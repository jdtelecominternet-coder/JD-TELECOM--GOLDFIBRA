import { getStats, getProcesses, getClients, getMessages } from './store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, FolderOpen, Users, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export default function Dashboard({ user }) {
  const stats = getStats();
  const processes = getProcesses();
  const clients = getClients();

  const barData = [
    { mes: 'Jan', processos: 4 }, { mes: 'Fev', processos: 6 }, { mes: 'Mar', processos: 5 },
    { mes: 'Abr', processos: 8 }, { mes: 'Mai', processos: 7 }, { mes: 'Jun', processos: stats.total },
  ];

  const pieData = [
    { name: 'Em Andamento', value: stats.andamento, color: '#C9A84C' },
    { name: 'Finalizados', value: stats.finalizado, color: '#27AE60' },
    { name: 'Aguardando', value: stats.aguardando, color: '#2980B9' },
  ];

  const statCards = [
    { label: 'Total de Processos', value: stats.total, icon: FolderOpen, color: '#C9A84C', sub: 'processos cadastrados' },
    { label: 'Em Andamento', value: stats.andamento, icon: Clock, color: '#E8C96A', sub: 'processos ativos' },
    { label: 'Finalizados', value: stats.finalizado, icon: CheckCircle, color: '#27AE60', sub: 'processos concluídos' },
    { label: 'Honorários a Receber', value: fmt(stats.aReceber), icon: DollarSign, color: '#C9A84C', sub: 'valor pendente' },
    { label: 'Total Clientes', value: clients.length, icon: Users, color: '#9A7A2E', sub: 'clientes ativos' },
    { label: 'Honorários Recebidos', value: fmt(stats.honorariosPago), icon: TrendingUp, color: '#27AE60', sub: 'valor recebido' },
  ];

  const recent = processes.slice(-3).reverse();

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="font-cinzel" style={{ fontSize: '22px', color: 'var(--white)', marginBottom: '4px' }}>
          Bom dia, <span className="gold-text">{user.name.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>Visão geral do escritório — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ width: '40px', height: '40px', background: `${c.color}18`, border: `1px solid ${c.color}30`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={c.color} />
                </div>
              </div>
              <div style={{ color: 'var(--white)', fontSize: '22px', fontWeight: '700', fontFamily: 'Cinzel, serif', marginBottom: '4px' }}>{c.value}</div>
              <div style={{ color: 'var(--gold)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{c.label}</div>
              <div style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '20px' }}>PROCESSOS POR MÊS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="mes" tick={{ fill: '#C8C0B0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#C8C0B0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#F5F0E8' }} />
              <Bar dataKey="processos" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '20px' }}>STATUS</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#F5F0E8' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{d.name}</span>
                <span style={{ color: 'var(--white)', fontSize: '12px', marginLeft: 'auto', fontWeight: '600' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent processes */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '16px' }}>PROCESSOS RECENTES</h3>
        <table className="table-dark">
          <thead><tr><th>Número</th><th>Tipo</th><th>Status</th><th>Honorários</th></tr></thead>
          <tbody>
            {recent.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.number}</td>
                <td>{p.type}</td>
                <td><StatusBadge status={p.status} /></td>
                <td style={{ color: 'var(--gold)' }}>{fmt(p.honorarios || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    andamento: { color: '#C9A84C', bg: 'rgba(201,168,76,0.12)', label: 'Em Andamento' },
    finalizado: { color: '#27AE60', bg: 'rgba(39,174,96,0.12)', label: 'Finalizado' },
    aguardando: { color: '#2980B9', bg: 'rgba(41,128,185,0.12)', label: 'Aguardando' },
    pendente: { color: '#E67E22', bg: 'rgba(230,126,34,0.12)', label: 'Pendente' },
    assinado: { color: '#27AE60', bg: 'rgba(39,174,96,0.12)', label: 'Assinado' },
  };
  const s = map[status] || map.pendente;
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em' }}>{s.label}</span>;
}
