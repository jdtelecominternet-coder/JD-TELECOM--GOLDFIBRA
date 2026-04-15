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
    SELECT u.id, u.name, u.jd_id,
      (SELECT so.status FROM service_orders so WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_status,
      (SELECT so.os_number FROM service_orders so WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_os,
      (SELECT so.readable_id FROM service_orders so WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_readable_id,
      (SELECT c.name FROM service_orders so JOIN clients c ON c.id=so.client_id WHERE so.technician_id=u.id AND so.status NOT IN ('finalizado','cancelado') ORDER BY so.created_at DESC LIMIT 1) as current_client
    FROM users u WHERE u.role='tecnico' AND u.active=1 ORDER BY u.name
  `).all();

  // Financial summary
  const financial = db.prepare(`
    SELECT
      COUNT(CASE WHEN so.payment_seller_status='a_receber' THEN 1 END) as seller_a_receber_count,
      COUNT(CASE WHEN so.payment_seller_status='pago' THEN 1 END) as seller_pago_count,
      COUNT(CASE WHEN so.payment_tech_status='pendente' AND so.status='finalizado' THEN 1 END) as tech_pendente_count,
      COUNT(CASE WHEN so.payment_tech_status='pago' THEN 1 END) as tech_pago_count,
      COALESCE(SUM(CASE WHEN so.payment_seller_status='a_receber' THEN p.price ELSE 0 END),0) as seller_a_receber_valor,
      COALESCE(SUM(CASE WHEN so.payment_seller_status='pago' THEN p.price ELSE 0 END),0) as seller_pago_valor
    FROM service_orders so LEFT JOIN plans p ON p.id=so.plan_id WHERE so.status='finalizado'
  `).get();

  res.json({
    clients: { total: total_clients, active: active_clients, pending: pending_clients, cancelled: cancelled_clients },
    orders: { total: total_orders, pending: pending_orders, finished: finished_orders },
    team: { sellers: total_sellers, technicians: total_technicians },
    monthly_revenue,
    recent_orders,
    seller_stats: seller_stats_with_commission,
    tech_stats: tech_stats_with_earnings,
    tech_operational,
    financial,
    commission_config: { type: commType, seller_value: commVal, tech_value: techVal }
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
    const sales = db.prepare(`
      SELECT COUNT(c.id) as total_sales, COALESCE(SUM(p.price),0) as total_revenue,
        COUNT(CASE WHEN c.status='ativo' THEN 1 END) as active_clients
      FROM clients c LEFT JOIN plans p ON p.id=c.plan_id WHERE c.seller_id=?`).get(req.user.id);
    const commission = commType === 'percent'
      ? (sales.total_revenue * commVal / 100)
      : (sales.total_sales * commVal);
    // Payment breakdown for seller
    const pay = db.prepare(`
      SELECT
        COUNT(CASE WHEN so.payment_seller_status='a_receber' THEN 1 END) as a_receber_count,
        COUNT(CASE WHEN so.payment_seller_status='pago' THEN 1 END) as pago_count,
        COALESCE(SUM(CASE WHEN so.payment_seller_status='a_receber' THEN p.price ELSE 0 END),0) as a_receber_valor,
        COALESCE(SUM(CASE WHEN so.payment_seller_status='pago' THEN p.price ELSE 0 END),0) as pago_valor
      FROM service_orders so LEFT JOIN plans p ON p.id=so.plan_id
      JOIN clients c ON c.id=so.client_id WHERE c.seller_id=? AND so.status='finalizado'
    `).get(req.user.id);
    const comm_a_receber = commType === 'percent' ? (pay.a_receber_valor * commVal / 100) : (pay.a_receber_count * commVal);
    const comm_pago      = commType === 'percent' ? (pay.pago_valor * commVal / 100) : (pay.pago_count * commVal);
    res.json({ ...sales, commission, commission_type: commType, commission_value: commVal, ...pay, comm_a_receber, comm_pago });
  } else if (req.user.role === 'tecnico') {
    const r = db.prepare(`SELECT COUNT(*) as installations FROM service_orders WHERE technician_id=? AND status='finalizado'`).get(req.user.id);
    res.json({ installations: r.installations, earnings: r.installations * techVal, tech_value: techVal });
  } else {
    res.json({});
  }
});

const DEFAULT_ROLE_PERMS = {
  vendedor: { dashboard: true, users: false, clients: true, plans: true, orders: true, transfer: true, technical: false, reports: false, chat: false, settings: false },
  tecnico:  { dashboard: true, users: false, clients: false, plans: false, orders: false, transfer: false, technical: true, reports: false, chat: true, settings: false },
};
router.get('/role-permissions', authMiddleware, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT role_permissions FROM settings WHERE id=1').get();
  if (s && s.role_permissions) { try { const stored = JSON.parse(s.role_permissions); return res.json({ vendedor: { ...DEFAULT_ROLE_PERMS.vendedor, ...(stored.vendedor||{}) }, tecnico: { ...DEFAULT_ROLE_PERMS.tecnico, ...(stored.tecnico||{}) } }); } catch(_){} }
  res.json(DEFAULT_ROLE_PERMS);
});
router.put('/role-permissions', authMiddleware, adminOnly, (req, res) => {
  const db = getDb(); const { role, permissions } = req.body;
  if (!['vendedor','tecnico'].includes(role)) return res.status(400).json({ error: 'Role invalido' });
  const current = db.prepare('SELECT role_permissions FROM settings WHERE id=1').get();
  let obj = {}; if (current && current.role_permissions) { try { obj = JSON.parse(current.role_permissions); } catch(_){} }
  obj[role] = { ...DEFAULT_ROLE_PERMS[role], ...permissions };
  db.prepare('UPDATE settings SET role_permissions=? WHERE id=1').run(JSON.stringify(obj));
  res.json({ message: 'Salvo' });
});
module.exports = router;
