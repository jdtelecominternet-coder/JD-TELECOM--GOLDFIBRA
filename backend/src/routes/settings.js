const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/logos')),
  filename: (req, file, cb) => cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/settings
router.get('/', (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT * FROM settings WHERE id=1').get();
  res.json(s || { company_name: 'JD TELECOM - GOLD FIBRA', logo_url: null, seller_commission_type: 'percent', seller_commission_value: 10, tech_commission_value: 50 });
});

// POST /api/settings/logo
router.post('/logo', authMiddleware, adminOnly, uploadLogo.single('logo'), (req, res) => {
  const db = getDb();
  if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });
  const url = `/uploads/logos/${req.file.filename}`;
  db.prepare('UPDATE settings SET logo_url=? WHERE id=1').run(url);
  res.json({ logo_url: url });
});

// PUT /api/settings/commissions - admin sets commission values
router.put('/commissions', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { seller_commission_type, seller_commission_value, tech_commission_value } = req.body;
  db.prepare(`UPDATE settings SET seller_commission_type=?, seller_commission_value=?, tech_commission_value=?, updated_at=datetime('now') WHERE id=1`)
    .run(seller_commission_type || 'percent', seller_commission_value ?? 10, tech_commission_value ?? 50);
  res.json({ message: 'Comissões atualizadas' });
});

// GET /api/settings/dashboard - admin only
router.get('/dashboard', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const cfg = db.prepare('SELECT * FROM settings WHERE id=1').get() || {};

  const total_clients   = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  const active_clients  = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='ativo'").get().c;
  const pending_clients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='pendente'").get().c;
  const cancelled_clients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='cancelado'").get().c;
  const total_orders    = db.prepare('SELECT COUNT(*) as c FROM service_orders').get().c;
  const pending_orders  = db.prepare("SELECT COUNT(*) as c FROM service_orders WHERE status='pendente'").get().c;
  const finished_orders = db.prepare("SELECT COUNT(*) as c FROM service_orders WHERE status='finalizado'").get().c;
  const total_sellers   = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='vendedor' AND active=1").get().c;
  const total_technicians = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='tecnico' AND active=1").get().c;

  const rev = db.prepare(`SELECT COALESCE(SUM(p.price),0) as total FROM clients c JOIN plans p ON p.id=c.plan_id WHERE c.status='ativo'`).get();
  const monthly_revenue = rev?.total || 0;

  const recent_orders = db.prepare(`
    SELECT so.os_number, so.status, so.created_at, c.name as client_name, t.name as tech_name
    FROM service_orders so JOIN clients c ON c.id=so.client_id LEFT JOIN users t ON t.id=so.technician_id
    ORDER BY so.created_at DESC LIMIT 5`).all();

  // Seller commissions breakdown
  const seller_stats = db.prepare(`
    SELECT u.id, u.name, u.jd_id, COUNT(c.id) as sales, COALESCE(SUM(p.price),0) as revenue
    FROM users u LEFT JOIN clients c ON c.seller_id=u.id LEFT JOIN plans p ON p.id=c.plan_id
    WHERE u.role='vendedor' AND u.active=1 GROUP BY u.id ORDER BY revenue DESC LIMIT 5`).all();

  const commType  = cfg.seller_commission_type || 'percent';
  const commVal   = cfg.seller_commission_value ?? 10;
  const techVal   = cfg.tech_commission_value ?? 50;

  const seller_stats_with_commission = seller_stats.map(s => ({
    ...s,
    commission: commType === 'percent' ? (s.revenue * commVal / 100) : (s.sales * commVal)
  }));

  // Tech stats
  const tech_stats = db.prepare(`
    SELECT u.id, u.name, u.jd_id, COUNT(so.id) as installations
    FROM users u LEFT JOIN service_orders so ON so.technician_id=u.id AND so.status='finalizado'
    WHERE u.role='tecnico' AND u.active=1 GROUP BY u.id ORDER BY installations DESC LIMIT 5`).all();

  const tech_stats_with_earnings = tech_stats.map(t => ({
    ...t,
    earnings: t.installations * techVal
  }));

  // Tech real-time operational status
  const tech_operational = db.prepare(`
    SELECT u.id, u.name, u.jd_id, u.role,
      (SELECT so.status FROM service_orders so WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_status,
      (SELECT so.os_number FROM service_orders so WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_os,
      (SELECT so.readable_id FROM service_orders so WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_readable_id,
      (SELECT c.name FROM service_orders so JOIN clients c ON c.id=so.client_id WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_client,
      (SELECT mo.status FROM maintenance_orders mo WHERE mo.assigned_tech_id=u.id AND mo.status NOT IN ('concluido','cancelado') ORDER BY mo.created_at DESC LIMIT 1) as rede_status,
      (SELECT mo.readable_id FROM maintenance_orders mo WHERE mo.assigned_tech_id=u.id AND mo.status NOT IN ('concluido','cancelado') ORDER BY mo.created_at DESC LIMIT 1) as rede_readable_id,
      (SELECT mo.cto_number FROM maintenance_orders mo WHERE mo.assigned_tech_id=u.id AND mo.status NOT IN ('concluido','cancelado') ORDER BY mo.created_at DESC LIMIT 1) as rede_cto
    FROM users u WHERE u.role IN ('tecnico','manutencao') AND u.active=1 ORDER BY u.role, u.name
  `).all();

  // Financial summary
  // seller_a_receber_valor = comissão calculada (% do plano ou valor fixo), NÃO o valor do plano
  // tech_pendente_valor = valor_servico da OS, com fallback no valor_padrao do tipo de OS
  const rawFinancial = db.prepare(`
    SELECT
      COUNT(CASE WHEN (so.seller_status IS NULL OR so.seller_status != 'ja_recebido') THEN 1 END) as seller_a_receber_count,
      COUNT(CASE WHEN so.seller_status = 'ja_recebido' THEN 1 END) as seller_pago_count,
      COUNT(CASE WHEN (so.status_pagamento_tecnico IS NULL OR so.status_pagamento_tecnico='pendente') AND so.technician_id IS NOT NULL THEN 1 END) as tech_pendente_count,
      COUNT(CASE WHEN so.status_pagamento_tecnico='pago' THEN 1 END) as tech_pago_count,
      COALESCE(SUM(CASE WHEN (so.seller_status IS NULL OR so.seller_status != 'ja_recebido') THEN p.price ELSE 0 END),0) as seller_a_receber_receita,
      COALESCE(SUM(CASE WHEN so.seller_status = 'ja_recebido' THEN p.price ELSE 0 END),0) as seller_pago_receita,
      COALESCE(SUM(CASE WHEN (so.status_pagamento_tecnico IS NULL OR so.status_pagamento_tecnico='pendente') AND so.technician_id IS NOT NULL
        THEN COALESCE(so.valor_servico, tos.valor_padrao, 0) ELSE 0 END),0) as tech_pendente_valor,
      COALESCE(SUM(CASE WHEN so.status_pagamento_tecnico='pago'
        THEN COALESCE(so.valor_servico, tos.valor_padrao, 0) ELSE 0 END),0) as tech_pago_valor
    FROM service_orders so
    LEFT JOIN plans p ON p.id=so.plan_id
    LEFT JOIN tipos_ordem_servico tos ON tos.id=so.tipo_os_id
    WHERE so.status='finalizado'
  `).get();

  // Calcular comissão correta do vendedor (% ou valor fixo)
  const financial = {
    ...rawFinancial,
    seller_a_receber_valor: commType === 'percent'
      ? (rawFinancial.seller_a_receber_receita * commVal / 100)
      : (rawFinancial.seller_a_receber_count * commVal),
    seller_pago_valor: commType === 'percent'
      ? (rawFinancial.seller_pago_receita * commVal / 100)
      : (rawFinancial.seller_pago_count * commVal),
  };

  // Ganhos por tipo de OS (técnicos)
  const por_tipo = db.prepare(`
    SELECT tipo_ordem_servico as tipo,
      COUNT(*) as qtd,
      COALESCE(SUM(valor_servico),0) as total
    FROM service_orders
    WHERE status='finalizado' AND tipo_ordem_servico IS NOT NULL
    GROUP BY tipo_ordem_servico ORDER BY total DESC
  `).all();

  // Listas de pagamentos pendentes para o admin marcar como pago
  const pending_seller_payments = db.prepare(`
    SELECT so.id, so.os_number, so.readable_id, so.seller_status,
           c.name as client_name, p.price as plan_price, p.name as plan_name,
           u.name as seller_name, u.jd_id as seller_jd_id
    FROM service_orders so
    LEFT JOIN clients c ON c.id=so.client_id
    LEFT JOIN plans p ON p.id=so.plan_id
    LEFT JOIN users u ON u.id=so.seller_id
    WHERE so.status='finalizado' AND (so.seller_status IS NULL OR so.seller_status != 'ja_recebido')
    ORDER BY so.finished_at DESC
  `).all();

  const pending_tech_payments = db.prepare(`
    SELECT so.id, so.os_number, so.readable_id, so.status_pagamento_tecnico,
           COALESCE(so.valor_servico, tos.valor_padrao, ?) as valor_servico,
           so.tipo_ordem_servico, c.name as client_name,
           u.name as tech_name, u.jd_id as tech_jd_id
    FROM service_orders so
    LEFT JOIN clients c ON c.id=so.client_id
    LEFT JOIN tipos_ordem_servico tos ON tos.id=so.tipo_os_id
    LEFT JOIN users u ON u.id=so.technician_id
    WHERE so.status='finalizado'
      AND so.technician_id IS NOT NULL
      AND (so.status_pagamento_tecnico IS NULL OR so.status_pagamento_tecnico='pendente')
    ORDER BY so.finished_at DESC
  `).all(techVal);

  res.json({
    clients: { total: total_clients, active: active_clients, pending: pending_clients, cancelled: cancelled_clients },
    orders: { total: total_orders, pending: pending_orders, finished: finished_orders },
    team: { sellers: total_sellers, technicians: total_technicians },
    monthly_revenue,
    recent_orders,
    seller_stats: seller_stats_with_commission,
    tech_stats: tech_stats_with_earnings,
    tech_operational,
    financial: { ...financial, por_tipo },
    commission_config: { type: commType, seller_value: commVal, tech_value: techVal },
    pending_seller_payments,
    pending_tech_payments,
  });
});

// GET /api/settings/my-earnings - for seller/tech to see their own earnings
router.get('/my-earnings', authMiddleware, (req, res) => {
  const db = getDb();
  const cfg = db.prepare('SELECT * FROM settings WHERE id=1').get() || {};
  const commType = cfg.seller_commission_type || 'percent';
  const commVal  = cfg.seller_commission_value ?? 10;
  const techVal  = cfg.tech_commission_value ?? 50;

  if (req.user.role === 'vendedor') {
    // OS deste vendedor com status de pagamento
    const os_list = db.prepare(`
      SELECT so.id, so.os_number, so.readable_id, so.tipo_ordem_servico, so.valor_servico,
             so.seller_status, so.status, so.scheduled_date, so.finished_at, so.admin_message,
             c.name as client_name, p.name as plan_name, p.price as plan_price
      FROM service_orders so
      LEFT JOIN clients c ON c.id=so.client_id
      LEFT JOIN plans p ON p.id=so.plan_id
      WHERE (so.seller_id=? OR c.seller_id=?) AND so.status != 'cancelado'
      ORDER BY so.created_at DESC
    `).all(req.user.id, req.user.id);

    const total_sales = os_list.length;
    const active_count = os_list.filter(o => o.status === 'finalizado').length;

    function calcComm(price) {
      return commType === 'percent' ? ((price || 0) * commVal / 100) : commVal;
    }

    // A RECEBER = OS finalizadas que ainda não foram pagas (a_receber, pendente ou NULL)
    const a_receber_list = os_list.filter(o => o.status === 'finalizado' && o.seller_status !== 'ja_recebido');
    const a_receber_count = a_receber_list.length;
    const comm_a_receber = a_receber_list.reduce((sum, o) => sum + calcComm(o.plan_price), 0);

    // JÁ RECEBIDO = seller_status='ja_recebido'
    const pago_list = os_list.filter(o => o.seller_status === 'ja_recebido');
    const pago_count = pago_list.length;
    const comm_pago = pago_list.reduce((sum, o) => sum + calcComm(o.plan_price), 0);

    res.json({
      total_sales, active_count, commission_type: commType, commission_value: commVal,
      a_receber_count, comm_a_receber,
      pago_count, comm_pago,
      os_list
    });
  } else if (req.user.role === 'tecnico') {
    const r = db.prepare(`SELECT COUNT(*) as installations FROM service_orders WHERE technician_id=? AND status='finalizado'`).get(req.user.id);

    // A RECEBER: só OS finalizadas e não pagas
    const pendente_count = db.prepare(`
      SELECT COUNT(*) as c FROM service_orders
      WHERE technician_id=? AND status = 'finalizado'
        AND (status_pagamento_tecnico IS NULL OR status_pagamento_tecnico='pendente')
    `).get(req.user.id).c;

    // JÁ RECEBIDO
    const pago_count = db.prepare(`
      SELECT COUNT(*) as c FROM service_orders
      WHERE technician_id=? AND status_pagamento_tecnico='pago'
    `).get(req.user.id).c;

    // Valor a receber (só finalizadas e não pagas)
    const pendente_valor = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(so.valor_servico, tos.valor_padrao, ?)),0) as v
      FROM service_orders so LEFT JOIN tipos_ordem_servico tos ON tos.id=so.tipo_os_id
      WHERE so.technician_id=? AND so.status = 'finalizado'
        AND (so.status_pagamento_tecnico IS NULL OR so.status_pagamento_tecnico='pendente')
    `).get(techVal, req.user.id).v;

    // Valor já recebido
    const pago_valor = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(so.valor_servico, tos.valor_padrao, ?)),0) as v
      FROM service_orders so LEFT JOIN tipos_ordem_servico tos ON tos.id=so.tipo_os_id
      WHERE so.technician_id=? AND so.status_pagamento_tecnico='pago'
    `).get(techVal, req.user.id).v;

    // Lista de todas as OS do técnico (não canceladas)
    const os_list = db.prepare(`
      SELECT so.id, so.os_number, so.readable_id, so.tipo_ordem_servico,
             COALESCE(so.valor_servico, tos.valor_padrao, ?) as valor_servico,
             so.status_pagamento_tecnico, so.status, so.scheduled_date, so.finished_at,
             c.name as client_name
      FROM service_orders so
      LEFT JOIN clients c ON c.id=so.client_id
      LEFT JOIN tipos_ordem_servico tos ON tos.id=so.tipo_os_id
      WHERE so.technician_id=? AND so.status IN ('finalizado','pendente','em_deslocamento','em_execucao')
      ORDER BY so.created_at DESC LIMIT 50
    `).all(techVal, req.user.id);

    res.json({ installations: r.installations, earnings: r.installations * techVal, tech_value: techVal, pendente_count, pago_count, pendente_valor, pago_valor, os_list });
  } else {
    res.json({});
  }
});

const DEFAULT_ROLE_PERMS = {
  vendedor:   { dashboard: true,  users: false, clients: true,  plans: true,  orders: true,  transfer: true,  technical: false, reports: false, chat: false, settings: false },
  tecnico:    { dashboard: true,  users: false, clients: false, plans: false, orders: false, transfer: false, technical: true,  reports: false, chat: true,  settings: false },
  manutencao: { dashboard: false, users: false, clients: false, plans: false, orders: false, transfer: false, technical: false, servico_rede: true, reports: false, chat: true, settings: false },
};

const DEFAULT_OS_VALUES = {
  'Adesão / Ativação': 120,
  'Mudança de Endereço': 80,
  'Troca de Equipamento': 60,
  'Retirada de Equipamento': 50,
  'Troca de Drop (Rompimento)': 70,
};
const TIPOS_VALIDOS = new Set(Object.keys(DEFAULT_OS_VALUES));

// GET /api/settings/valores-por-tipo
router.get('/valores-por-tipo', authMiddleware, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT valores_por_tipo FROM settings WHERE id=1').get();
  try {
    const saved = s?.valores_por_tipo ? JSON.parse(s.valores_por_tipo) : {};
    res.json({ ...DEFAULT_OS_VALUES, ...saved });
  } catch { res.json(DEFAULT_OS_VALUES); }
});

// PUT /api/settings/valores-por-tipo
router.put('/valores-por-tipo', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const body = req.body;

  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return res.status(400).json({ error: 'Payload inválido: esperado objeto.' });

  const chaveInvalida = Object.keys(body).find(k => !TIPOS_VALIDOS.has(k));
  if (chaveInvalida)
    return res.status(400).json({ error: `Tipo de OS desconhecido: "${chaveInvalida}".` });

  const invalido = Object.entries(body).find(([, v]) => typeof v !== 'number' || !isFinite(v) || v < 0);
  if (invalido)
    return res.status(400).json({ error: `Valor inválido para "${invalido[0]}": deve ser um número maior ou igual a zero.` });

  const existing = db.prepare('SELECT valores_por_tipo FROM settings WHERE id=1').get();
  const current = (() => {
    try {
      const parsed = existing?.valores_por_tipo ? JSON.parse(existing.valores_por_tipo) : null;
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch { return {}; }
  })();
  const safeCurrent = Object.fromEntries(Object.entries(current).filter(([k]) => TIPOS_VALIDOS.has(k)));
  db.prepare('UPDATE settings SET valores_por_tipo=? WHERE id=1').run(JSON.stringify({ ...safeCurrent, ...body }));
  res.json({ message: 'Valores padrão salvos!' });
});
router.get('/role-permissions', authMiddleware, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT role_permissions FROM settings WHERE id=1').get();
  if (s && s.role_permissions) { try { const stored = JSON.parse(s.role_permissions); return res.json({ vendedor: { ...DEFAULT_ROLE_PERMS.vendedor, ...(stored.vendedor||{}) }, tecnico: { ...DEFAULT_ROLE_PERMS.tecnico, ...(stored.tecnico||{}) }, manutencao: { ...DEFAULT_ROLE_PERMS.manutencao, ...(stored.manutencao||{}) } }); } catch(_){} }
  res.json(DEFAULT_ROLE_PERMS);
});
router.put('/role-permissions', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { role, permissions } = req.body;

  if (!['vendedor', 'tecnico', 'manutencao'].includes(role))
    return res.status(400).json({ error: 'Role inválido.' });

  if (typeof permissions !== 'object' || permissions === null || Array.isArray(permissions))
    return res.status(400).json({ error: 'Payload inválido: permissions deve ser um objeto.' });

  const allowedKeys = new Set(Object.keys(DEFAULT_ROLE_PERMS[role]));
  const chaveInvalida = Object.keys(permissions).find(k => !allowedKeys.has(k));
  if (chaveInvalida)
    return res.status(400).json({ error: `Permissão desconhecida: "${chaveInvalida}".` });

  const valorInvalido = Object.entries(permissions).find(([, v]) => typeof v !== 'boolean');
  if (valorInvalido)
    return res.status(400).json({ error: `Valor inválido para "${valorInvalido[0]}": deve ser booleano.` });

  const safePerms = Object.fromEntries(Object.entries(permissions).filter(([k]) => allowedKeys.has(k)));

  const current = db.prepare('SELECT role_permissions FROM settings WHERE id=1').get();
  let obj = {};
  if (current?.role_permissions) {
    try {
      const parsed = JSON.parse(current.role_permissions);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
    } catch (_) {}
  }
  obj[role] = { ...DEFAULT_ROLE_PERMS[role], ...(obj[role] || {}), ...safePerms };
  db.prepare('UPDATE settings SET role_permissions=? WHERE id=1').run(JSON.stringify(obj));
  res.json({ message: 'Salvo' });
});
module.exports = router;
