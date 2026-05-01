import { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, 
  AlertCircle, PieChart, BarChart3, Calendar,
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function FinancialDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, cashFlowRes] = await Promise.all([
        api.get('/financial/dashboard'),
        api.get(`/financial/cash-flow?period=${period}`)
      ]);
      
      setData({
        dashboard: dashboardRes.data,
        cashFlow: cashFlowRes.data
      });
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
      toast.error('Erro ao carregar dashboard financeiro');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!data) return null;

  const { kpis, charts, alerts, suggestions } = data.dashboard;
  const { revenues, expenses, results } = data.cashFlow;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            💰 Painel Financeiro
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Controle completo da saúde financeira da empresa
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input"
          >
            <option value="day">Hoje</option>
            <option value="week">Última Semana</option>
            <option value="month">Este Mês</option>
            <option value="year">Este Ano</option>
          </select>
          <button onClick={loadData} className="btn-secondary p-2" title="Atualizar">
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{
                background: alert.type === 'danger' 
                  ? 'rgba(239,68,68,0.1)' 
                  : 'rgba(245,158,11,0.1)',
                border: `1px solid ${alert.type === 'danger' 
                  ? 'rgba(239,68,68,0.3)' 
                  : 'rgba(245,158,11,0.3)'}`,
                color: alert.type === 'danger' ? '#ef4444' : '#f59e0b'
              }}
            >
              <span className="text-2xl">{alert.icon}</span>
              <span className="font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Receita do Período"
          value={formatCurrency(revenues.received)}
          trend={results.margin > 0 ? 'up' : 'down'}
          trendValue={`${results.margin}% margem`}
          color="#22c55e"
        />
        
        <KpiCard
          icon={TrendingDown}
          label="Despesas"
          value={formatCurrency(expenses)}
          color="#ef4444"
        />
        <KpiCard
          icon={Wallet}
          label="Lucro Líquido"
          value={formatCurrency(results.net_profit)}
          trend={results.net_profit >= 0 ? 'up' : 'down'}
          color={results.net_profit >= 0 ? '#22c55e' : '#ef4444'}
        />
        <KpiCard
          icon={CreditCard}
          label="A Receber"
          value={formatCurrency(revenues.pending)}
          subValue={`${formatCurrency(revenues.overdue)} atrasado`}
          color="#f59e0b"
        />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Clientes Ativos"
          value={kpis.active_clients}
          subValue={`${kpis.delinquent_clients} inadimplentes`}
        />
        <StatCard
          icon={AlertCircle}
          label="Saúde Financeira"
          value={kpis.financial_health === 'boa' ? 'Boa' : kpis.financial_health === 'regular' ? 'Regular' : 'Crítica'}
          color={kpis.financial_health === 'boa' ? '#22c55e' : kpis.financial_health === 'regular' ? '#f59e0b' : '#ef4444'}
        />
        <StatCard
          icon={PieChart}
          label="Margem de Lucro"
          value={`${kpis.profit_margin}%`}
          trend={parseFloat(kpis.profit_margin) > 20 ? 'up' : 'down'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receitas vs Despesas */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Receitas vs Despesas
          </h3>
          <div className="h-64 flex items-end justify-around gap-2">
            {charts.revenue.map((item, idx) => {
              const expense = charts.expenses.find(e => e.month === item.month)?.total || 0;
              const maxVal = Math.max(item.total, expense, 1);
              
              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full flex gap-1 h-48 items-end">
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        background: '#22c55e',
                        height: `${(item.total / maxVal) * 100}%`,
                        minHeight: item.total > 0 ? '4px' : '0'
                      }}
                      title={`Receita: ${formatCurrency(item.total)}`}
                    />
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        background: '#ef4444',
                        height: `${(expense / maxVal) * 100}%`,
                        minHeight: expense > 0 ? '4px' : '0'
                      }}
                      title={`Despesa: ${formatCurrency(expense)}`}
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.month.split('-')[1]}
                  </span>
                </div>
              );
            })}
          </div>          
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#22c55e' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Despesas</span>
            </div>
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <PieChart className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Despesas por Categoria
          </h3>
          <div className="space-y-3">
            {charts.expenses_by_category.map((item, idx) => {
              const total = charts.expenses_by_category.reduce((sum, i) => sum + i.total, 0);
              const percentage = total > 0 ? (item.total / total * 100).toFixed(1) : 0;
              
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {getCategoryIcon(item.category)} {getCategoryName(item.category)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(item.total)} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: getCategoryColor(item.category),
                        width: `${percentage}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sugestões da IA */}
      {suggestions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>🤖</span>
            Análise Inteligente & Sugestões
          </h3>
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: suggestion.priority === 'critical' 
                    ? 'rgba(239,68,68,0.1)' 
                    : 'rgba(37,99,235,0.1)',
                  border: `1px solid ${suggestion.priority === 'critical' 
                    ? 'rgba(239,68,68,0.3)' 
                    : 'rgba(37,99,235,0.3)'}`
                }}
              >
                <span className="text-xl">
                  {suggestion.priority === 'critical' ? '🚨' : '💡'}
                </span>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {suggestion.message}
                  </p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {suggestion.type === 'improvement'
                      ? 'Oportunidade de melhoria'
                      : suggestion.type === 'collection'
                      ? 'Ação de cobrança recomendada'
                      : 'Ação urgente necessária'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componentes auxiliares
function KpiCard({ icon: Icon, label, value, trend, trendValue, color, subValue }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        
        {trend && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              background: trend === 'up' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: trend === 'up' ? '#22c55e' : '#ef4444'
            }}
          >
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      
      <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      
      {subValue && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{subValue}</p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subValue, trend }) {
  return (
    <div className="card text-center">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
        style={{ background: color ? `${color}20` : 'var(--bg-input)' }}
      >
        <Icon className="w-5 h-5" style={{ color: color || 'var(--text-muted)' }} />
      </div>
      
      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
      
      {subValue && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{subValue}</p>
      )}
    </div>
  );
}

// Funções auxiliares
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function getCategoryIcon(category) {
  const icons = {
    operacional: '🔧',
    fixas: '🏢',
    logistica: '🚗',
    patrimonial: '🏠',
    marketing: '📢',
    impostos: '📋'
  };
  return icons[category] || '📄';
}

function getCategoryName(category) {
  const names = {
    operacional: 'Operacionais',
    fixas: 'Fixas',
    logistica: 'Logística',
    patrimonial: 'Patrimonial',
    marketing: 'Marketing',
    impostos: 'Impostos'
  };
  return names[category] || category;
}

function getCategoryColor(category) {
  const colors = {
    operacional: '#3b82f6',
    fixas: '#8b5cf6',
    logistica: '#f59e0b',
    patrimonial: '#10b981',
    marketing: '#ec4899',
    impostos: '#6366f1'
  };
  return colors[category] || '#6b7280';
}
