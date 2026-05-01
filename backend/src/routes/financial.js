const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware } = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GESTÃO DE CLIENTES FINANCEIROS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/financial/clients - Lista todos os clientes com status financeiro
router.get('/clients', (req, res) => {
  try {
    const db = getDb();
    const clients = db.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT CASE WHEN i.status = 'pendente' THEN i.id END) as pending_invoices,
        COUNT(DISTINCT CASE WHEN i.status = 'atrasado' THEN i.id END) as overdue_invoices,
        SUM(CASE WHEN i.status = 'pendente' THEN i.amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN i.status = 'atrasado' THEN i.amount ELSE 0 END) as total_overdue,
        MAX(CASE WHEN i.status = 'pago' THEN i.paid_at END) as last_payment_date,
        MAX(i.due_date) as next_due_date
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      GROUP BY c.id
      ORDER BY c.name
    `).all();

    // Calcular status automático
    const clientsWithStatus = clients.map(client => {
      let status = 'ativo';
      if (client.overdue_invoices > 0) status = 'atrasado';
      if (client.overdue_invoices >= 3) status = 'cancelado';
      
      return {
        ...client,
        financial_status: status,
        status_color: status === 'ativo' ? '#22c55e' : status === 'atrasado' ? '#f59e0b' : '#ef4444'
      };
    });

    res.json(clientsWithStatus);
  } catch (err) {
    console.error('Erro ao buscar clientes financeiros:', err);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// GET /api/financial/clients/:id/history - Histórico financeiro do cliente
router.get('/clients/:id/history', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const history = db.prepare(`
      SELECT 
        i.*,
        CASE 
          WHEN i.status = 'pago' THEN 'Pago'
          WHEN i.status = 'atrasado' THEN 'Atrasado'
          WHEN i.status = 'cancelado' THEN 'Cancelado'
          ELSE 'Pendente'
        END as status_label
      FROM invoices i
      WHERE i.client_id = ?
      ORDER BY i.due_date DESC
    `).all(id);

    res.json(history);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. COBRANÇAS E FATURAS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/financial/invoices - Lista todas as faturas
router.get('/invoices', (req, res) => {
  try {
    const db = getDb();
    const { status, client_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        i.*,
        c.name as client_name,
        c.jd_id as client_jd_id
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    if (client_id) {
      query += ' AND i.client_id = ?';
      params.push(client_id);
    }
    if (start_date) {
      query += ' AND i.due_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND i.due_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY i.due_date DESC';

    const invoices = db.prepare(query).all(...params);
    res.json(invoices);
  } catch (err) {
    console.error('Erro ao buscar faturas:', err);
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

// POST /api/financial/invoices - Cria nova fatura
router.post('/invoices', (req, res) => {
  try {
    const db = getDb();
    const { client_id, amount, description, due_date, payment_method } = req.body;

    if (!client_id || !amount || !due_date) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const result = db.prepare(`
      INSERT INTO invoices (client_id, amount, description, due_date, payment_method, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pendente', datetime('now'))
    `).run(client_id, amount, description, due_date, payment_method || 'boleto');

    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Fatura criada com sucesso'
    });
  } catch (err) {
    console.error('Erro ao criar fatura:', err);
    res.status(500).json({ error: 'Erro ao criar fatura' });
  }
});

// POST /api/financial/invoices/:id/pay - Marca fatura como paga
router.post('/invoices/:id/pay', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { payment_method, paid_amount } = req.body;

    db.prepare(`
      UPDATE invoices 
      SET status = 'pago', 
          paid_at = datetime('now'),
          payment_method = ?,
          paid_amount = ?
      WHERE id = ?
    `).run(payment_method || 'dinheiro', paid_amount || db.prepare('SELECT amount FROM invoices WHERE id = ?').pluck().get(id), id);

    res.json({ success: true, message: 'Pagamento registrado' });
  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    res.status(500).json({ error: 'Erro ao registrar pagamento' });
  }
});

// POST /api/financial/invoices/generate-recurring - Gera faturas recorrentes
router.post('/invoices/generate-recurring', (req, res) => {
  try {
    const db = getDb();
    const { month, year } = req.body;
    
    // Buscar clientes ativos com plano
    const activeClients = db.prepare(`
      SELECT c.id, c.name, p.price as amount, p.name as plan_name
      FROM clients c
      JOIN plans p ON c.plan_id = p.id
      WHERE c.active = 1 AND c.plan_id IS NOT NULL
    `).all();

    let generated = 0;
    const dueDate = `${year}-${String(month).padStart(2, '0')}-10`; // Vencimento dia 10

    for (const client of activeClients) {
      // Verificar se já existe fatura para este mês
      const exists = db.prepare(`
        SELECT 1 FROM invoices 
        WHERE client_id = ? AND strftime('%Y-%m', due_date) = ?
      `).get(client.id, `${year}-${String(month).padStart(2, '0')}`);

      if (!exists) {
        db.prepare(`
          INSERT INTO invoices (client_id, amount, description, due_date, payment_method, status, created_at)
          VALUES (?, ?, ?, ?, 'boleto', 'pendente', datetime('now'))
        `).run(
          client.id, 
          client.amount, 
          `Mensalidade - ${client.plan_name} - ${month}/${year}`,
          dueDate
        );
        generated++;
      }
    }

    res.json({ success: true, generated, message: `${generated} faturas geradas` });
  } catch (err) {
    console.error('Erro ao gerar faturas:', err);
    res.status(500).json({ error: 'Erro ao gerar faturas' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CONTROLE DE DESPESAS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/financial/expenses - Lista todas as despesas
router.get('/expenses', (req, res) => {
  try {
    const db = getDb();
    const { category, subcategory, start_date, end_date } = req.query;
    
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (subcategory) {
      query += ' AND subcategory = ?';
      params.push(subcategory);
    }
    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY date DESC';

    const expenses = db.prepare(query).all(...params);
    
    // Calcular totais por categoria
    const totals = db.prepare(`
      SELECT 
        category,
        SUM(amount) as total
      FROM expenses
      WHERE date >= date('now', 'start of month')
      GROUP BY category
    `).all();

    res.json({ expenses, totals });
  } catch (err) {
    console.error('Erro ao buscar despesas:', err);
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
});

// POST /api/financial/expenses - Cria nova despesa
router.post('/expenses', (req, res) => {
  try {
    const db = getDb();
    const { category, subcategory, description, amount, date, payment_method, recurring } = req.body;

    if (!category || !amount || !date) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const result = db.prepare(`
      INSERT INTO expenses (category, subcategory, description, amount, date, payment_method, recurring, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(category, subcategory || null, description, amount, date, payment_method || 'dinheiro', recurring ? 1 : 0);

    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Despesa registrada com sucesso'
    });
  } catch (err) {
    console.error('Erro ao registrar despesa:', err);
    res.status(500).json({ error: 'Erro ao registrar despesa' });
  }
});

// GET /api/financial/expenses/categories - Lista categorias de despesas
router.get('/expenses/categories', (req, res) => {
  const categories = [
    { 
      id: 'operacional', 
      name: 'Operacionais', 
      icon: '🔧',
      subcategories: ['Materiais', 'Funcionários', 'Serviços Terceirizados']
    },
    { 
      id: 'fixas', 
      name: 'Fixas', 
      icon: '🏢',
      subcategories: ['Energia', 'Água', 'Internet', 'Telefone']
    },
    { 
      id: 'logistica', 
      name: 'Logística', 
      icon: '🚗',
      subcategories: ['Abastecimento', 'Manutenção', 'Seguro Veículos']
    },
    { 
      id: 'patrimonial', 
      name: 'Patrimonial', 
      icon: '🏠',
      subcategories: ['Seguro Imóvel', 'Aluguel', 'Manutenção']
    },
    { 
      id: 'marketing', 
      name: 'Marketing', 
      icon: '📢',
      subcategories: ['Publicidade', 'Propaganda', 'Eventos']
    },
    { 
      id: 'impostos', 
      name: 'Impostos', 
      icon: '📋',
      subcategories: ['ISS', 'ICMS', 'IRPJ', 'CSLL']
    }
  ];
  
  res.json(categories);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. FLUXO DE CAIXA E RESULTADOS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/financial/cash-flow - Fluxo de caixa
router.get('/cash-flow', (req, res) => {
  try {
    const db = getDb();
    const { period = 'month' } = req.query;
    
    let dateFilter;
    switch(period) {
      case 'day': dateFilter = "date('now')"; break;
      case 'week': dateFilter = "date('now', '-7 days')"; break;
      case 'month': dateFilter = "date('now', 'start of month')"; break;
      case 'year': dateFilter = "date('now', 'start of year')"; break;
      default: dateFilter = "date('now', 'start of month')";
    }

    // Receitas
    const revenues = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'pago' THEN paid_amount ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN amount ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'atrasado' THEN amount ELSE 0 END), 0) as overdue
      FROM invoices
      WHERE due_date >= ${dateFilter}
    `).get();

    // Despesas
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE date >= ${dateFilter}
    `).get();

    // Cálculos financeiros
    const totalRevenue = revenues.received + revenues.pending;
    const grossProfit = revenues.received - expenses.total;
    const netProfit = grossProfit; // Simplificado

    res.json({
      period,
      revenues: {
        received: revenues.received,
        pending: revenues.pending,
        overdue: revenues.overdue,
        total: totalRevenue
      },
      expenses: expenses.total,
      results: {
        gross_profit: grossProfit,
        net_profit: netProfit,
        margin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0
      }
    });
  } catch (err) {
    console.error('Erro ao buscar fluxo de caixa:', err);
    res.status(500).json({ error: 'Erro ao buscar fluxo de caixa' });
  }
});

// GET /api/financial/dashboard - Dashboard financeiro completo
router.get('/dashboard', (req, res) => {
  try {
    const db = getDb();

    // KPIs principais
    const kpis = db.prepare(`
      SELECT 
        (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE status = 'pago' AND paid_at >= date('now', 'start of month')) as monthly_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= date('now', 'start of month')) as monthly_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'pendente') as total_receivable,
        (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'atrasado') as total_overdue,
        (SELECT COUNT(*) FROM clients WHERE active = 1) as active_clients,
        (SELECT COUNT(*) FROM clients c 
         JOIN invoices i ON c.id = i.client_id 
         WHERE i.status = 'atrasado' AND c.active = 1) as delinquent_clients
    `).get();

    // Dados para gráficos
    const revenueChart = db.prepare(`
      SELECT 
        strftime('%Y-%m', paid_at) as month,
        SUM(paid_amount) as total
      FROM invoices
      WHERE status = 'pago' AND paid_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `).all();

    const expenseChart = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(amount) as total
      FROM expenses
      WHERE date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `).all();

    // Despesas por categoria
    const expensesByCategory = db.prepare(`
      SELECT 
        category,
        SUM(amount) as total
      FROM expenses
      WHERE date >= date('now', 'start of month')
      GROUP BY category
      ORDER BY total DESC
    `).all();

    // Alertas
    const alerts = [];
    
    if (kpis.total_overdue > 5000) {
      alerts.push({
        type: 'warning',
        message: `R$ ${kpis.total_overdue.toFixed(2)} em atrasos. Considere ações de cobrança.`,
        icon: '⚠️'
      });
    }

    if (kpis.monthly_expenses > kpis.monthly_revenue * 0.8) {
      alerts.push({
        type: 'danger',
        message: 'Despesas acima de 80% da receita. Analise cortes.',
        icon: '🚨'
      });
    }

    if (kpis.delinquent_clients > kpis.active_clients * 0.2) {
      alerts.push({
        type: 'warning',
        message: `${kpis.delinquent_clients} clientes inadimplentes. Revise política de crédito.`,
        icon: '💳'
      });
    }

    // Análise inteligente
    const profitMargin = kpis.monthly_revenue > 0 
      ? ((kpis.monthly_revenue - kpis.monthly_expenses) / kpis.monthly_revenue * 100).toFixed(1)
      : 0;

    let financialHealth = 'boa';
    if (profitMargin < 10) financialHealth = 'crítica';
    else if (profitMargin < 20) financialHealth = 'regular';

    res.json({
      kpis: {
        ...kpis,
        monthly_profit: kpis.monthly_revenue - kpis.monthly_expenses,
        profit_margin: profitMargin,
        financial_health: financialHealth
      },
      charts: {
        revenue: revenueChart,
        expenses: expenseChart,
        expenses_by_category: expensesByCategory
      },
      alerts,
      suggestions: generateSuggestions(kpis, profitMargin)
    });
  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

// Função auxiliar para gerar sugestões
function generateSuggestions(kpis, margin) {
  const suggestions = [];
  
  if (margin < 15) {
    suggestions.push({
      type: 'improvement',
      message: 'Margem de lucro baixa. Considere aumentar preços ou reduzir custos operacionais.',
      priority: 'high'
    });
  }
  
  if (kpis.total_overdue > kpis.total_receivable * 0.3) {
    suggestions.push({
      type: 'collection',
      message: 'Alto índice de inadimplência. Implemente desconto para pagamento antecipado.',
      priority: 'high'
    });
  }
  
  if (kpis.monthly_expenses > kpis.monthly_revenue) {
    suggestions.push({
      type: 'urgent',
      message: 'Despesas superam receitas! Ação imediata necessária.',
      priority: 'critical'
    });
  }
  
  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. RELATÓRIOS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/financial/reports/summary - Resumo financeiro para relatórios
router.get('/reports/summary', (req, res) => {
  try {
    const db = getDb();
    const { start_date, end_date } = req.query;
    
    const summary = db.prepare(`
      SELECT 
        (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE status = 'pago' AND paid_at BETWEEN ? AND ?) as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date BETWEEN ? AND ?) as total_expenses,
        (SELECT COUNT(*) FROM invoices WHERE status = 'pago' AND paid_at BETWEEN ? AND ?) as paid_invoices,
        (SELECT COUNT(*) FROM invoices WHERE status = 'atrasado' AND due_date BETWEEN ? AND ?) as overdue_invoices
    `).get(start_date, end_date, start_date, end_date, start_date, end_date, start_date, end_date);

    summary.profit = summary.total_revenue - summary.total_expenses;
    summary.margin = summary.total_revenue > 0 ? (summary.profit / summary.total_revenue * 100).toFixed(2) : 0;

    res.json(summary);
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;