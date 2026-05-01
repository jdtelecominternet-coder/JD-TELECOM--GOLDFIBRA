const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// GET /api/financial/dashboard - Dashboard financeiro
router.get('/dashboard', (req, res) => {
  res.json({
    kpis: {
      monthly_revenue: 0,
      monthly_expenses: 0,
      total_receivable: 0,
      total_overdue: 0,
      active_clients: 0,
      delinquent_clients: 0,
      monthly_profit: 0,
      profit_margin: 0,
      financial_health: 'boa'
    },
    charts: {
      revenue: [],
      expenses: [],
      expenses_by_category: []
    },
    alerts: [],
    suggestions: []
  });
});

// GET /api/financial/cash-flow - Fluxo de caixa
router.get('/cash-flow', (req, res) => {
  res.json({
    period: 'month',
    revenues: { received: 0, pending: 0, overdue: 0, total: 0 },
    expenses: 0,
    results: { gross_profit: 0, net_profit: 0, margin: 0 }
  });
});

module.exports = router;