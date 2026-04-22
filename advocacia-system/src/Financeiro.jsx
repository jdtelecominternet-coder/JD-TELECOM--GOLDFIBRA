import { useState } from 'react';
import { getProcesses, getClients, getClientById } from './store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Filter } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export default function Financeiro() {
  const processes = getProcesses();
  const [filter, setFilter] = useState('todos');

  const data = processes.map(p => ({
    ...p,
    clientName: getClientById(p.clientId)?.name || '—',
    pendente: (p.honorarios || 0) - (p.honorariosPago || 0),
  }));

  const filtered = filter === 'todos' ? data : filter === 'recebido' ? data.filter(d => d.honorariosPago > 0) : data.filter(d => d.pendente > 0);

  const totalReceber = data.reduce((s, d) => s + d.pendente, 0);
  const totalRecebido = data.reduce((s, d) => s + (d.honorariosPago || 0), 0);
  const totalGeral = data.reduce((s, d) => s + (d.honorarios || 0), 0);

  const barData = data.map(d => ({
    nome: d.clientName.split(' ')[0],
    recebido: d.honorariosPago || 0,
    pendente: d.pendente,
  }));

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)' }}>Financeiro</h1>
        <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>Controle de honorários e pagamentos</p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Geral', value: fmt(totalGeral), icon: DollarSign, color: 'var(--gold)' },
          { label: 'Recebido', value: fmt(totalRecebido), icon: TrendingUp, color: '#27AE60' },
          { label: 'A Receber', value: fmt(totalReceber), icon: TrendingDown, color: '#E74C3C' },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: `${c.color}18`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={c.color} />
              </div>
              <div>
                <div style={{ color: 'var(--white)', fontSize: '20px', fontWeight: '700', fontFamily: 'Cinzel, serif' }}>{c.value}</div>
                <div style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '20px' }}>HONORÁRIOS POR PROCESSO</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <XAxis dataKey="nome" tick={{ fill: '#C8C0B0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#C8C0B0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#F5F0E8' }} formatter={(v) => fmt(v)} />
            <Bar dataKey="recebido" name="Recebido" fill="#27AE60" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pendente" name="Pendente" fill="#C9A84C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em' }}>DETALHAMENTO</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['todos', 'recebido', 'pendente'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${filter === f ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: filter === f ? 'rgba(201,168,76,0.12)' : 'transparent', color: filter === f ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-dark">
            <thead>
              <tr><th>Processo</th><th>Cliente</th><th>Total</th><th>Recebido</th><th>Pendente</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.number}</td>
                  <td>{d.clientName}</td>
                  <td style={{ color: 'var(--white)' }}>{fmt(d.honorarios || 0)}</td>
                  <td style={{ color: '#27AE60' }}>{fmt(d.honorariosPago || 0)}</td>
                  <td style={{ color: d.pendente > 0 ? '#E74C3C' : '#27AE60' }}>{fmt(d.pendente)}</td>
                  <td>
                    <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', background: d.pendente <= 0 ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)', color: d.pendente <= 0 ? '#27AE60' : '#E74C3C' }}>
                      {d.pendente <= 0 ? 'Quitado' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
