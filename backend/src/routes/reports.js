const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/sales', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { seller_id, from, to } = req.query;
  let q = `SELECT c.id, c.name as client_name, c.cpf, c.email, c.status as client_status,
    p.name as plan_name, p.speed, p.price, u.name as seller_name, u.jd_id as seller_jd_id, c.created_at,
    (SELECT so2.tipo_ordem_servico FROM service_orders so2 WHERE so2.client_id=c.id ORDER BY so2.created_at DESC LIMIT 1) as tipo_ordem_servico
    FROM clients c
    LEFT JOIN plans p ON p.id=c.plan_id
    LEFT JOIN users u ON u.id=c.seller_id
    WHERE 1=1`;
  const params = [];
  if (seller_id) { q += ' AND c.seller_id=?'; params.push(seller_id); }
  if (from) { q += ' AND c.created_at >= ?'; params.push(from); }
  if (to) { q += ' AND c.created_at <= ?'; params.push(to + ' 23:59:59'); }
  q += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/installations', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { tech_id, from, to } = req.query;
  let q = `SELECT so.os_number, so.status, so.scheduled_date, so.finished_at,
    so.drop_total, so.mat_esticador, so.mat_conector, so.mat_bucha, so.mat_fixa_cabo,
    so.tipo_ordem_servico,
    c.name as client_name, c.street, c.neighborhood, c.city,
    p.name as plan_name, p.speed, t.name as tech_name, t.jd_id as tech_jd_id, s.name as seller_name
    FROM service_orders so JOIN clients c ON c.id=so.client_id JOIN plans p ON p.id=so.plan_id
    LEFT JOIN users t ON t.id=so.technician_id LEFT JOIN users s ON s.id=so.seller_id WHERE 1=1`;
  const params = [];
  if (tech_id) { q += ' AND so.technician_id=?'; params.push(tech_id); }
  if (from) { q += ' AND so.created_at >= ?'; params.push(from); }
  if (to) { q += ' AND so.created_at <= ?'; params.push(to + ' 23:59:59'); }
  q += ' ORDER BY so.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/materials', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { tech_id, from, to } = req.query;
  let q = `SELECT t.name as tech_name, t.jd_id as tech_jd_id,
    SUM(so.drop_total) as total_drop, SUM(so.mat_esticador) as total_esticador,
    SUM(so.mat_conector) as total_conector, SUM(so.mat_bucha) as total_bucha,
    SUM(so.mat_fixa_cabo) as total_fixa_cabo, COUNT(so.id) as total_os
    FROM service_orders so JOIN users t ON t.id=so.technician_id WHERE so.status='finalizado'`;
  const params = [];
  if (tech_id) { q += ' AND so.technician_id=?'; params.push(tech_id); }
  if (from) { q += ' AND so.finished_at >= ?'; params.push(from); }
  if (to) { q += ' AND so.finished_at <= ?'; params.push(to + ' 23:59:59'); }
  q += ' GROUP BY t.id ORDER BY total_os DESC';
  res.json(db.prepare(q).all(...params));
});

// ── Relatório por Técnico ──────────────────────────────────────────────────
router.get('/technician', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { tech_id, from, to, status } = req.query;

  let q = `SELECT so.id, so.os_number, so.readable_id, so.status,
    so.created_at, so.started_at, so.arrived_at, so.finished_at, so.cancel_at,
    so.cancel_reason, so.cancel_description, so.cancel_photos,
    so.observations, so.tech_observations,
    so.photo_cto_open, so.photo_cto_closed, so.photo_signal_cto,
    so.photo_meter, so.photo_mac, so.photo_onu, so.photo_speedtest,
    so.tipo_ordem_servico, so.valor_servico, so.scheduled_date,
    c.name as client_name, c.street, c.neighborhood, c.city, c.whatsapp as client_phone,
    t.id as tech_id, t.name as tech_name, t.jd_id as tech_login, t.jd_id as tech_jd_id,
    s.name as seller_name
    FROM service_orders so
    LEFT JOIN clients c ON c.id=so.client_id
    LEFT JOIN users t ON t.id=so.technician_id
    LEFT JOIN users s ON s.id=so.seller_id
    WHERE 1=1`;
  const params = [];
  if (tech_id) { q += ' AND so.technician_id=?'; params.push(tech_id); }
  if (from) { q += ' AND so.created_at >= ?'; params.push(from); }
  if (to) { q += ' AND so.created_at <= ?'; params.push(to + ' 23:59:59'); }
  if (status && status !== 'todas') { q += ' AND so.status=?'; params.push(status); }
  q += ' ORDER BY so.created_at DESC';

  const orders = db.prepare(q).all(...params);

  // Summary stats
  const allForTech = tech_id
    ? db.prepare(`SELECT status, started_at, finished_at, arrived_at FROM service_orders WHERE technician_id=?`).all(tech_id)
    : [];

  const total = allForTech.length;
  const concluidas = allForTech.filter(o => o.status === 'finalizado').length;
  const canceladas = allForTech.filter(o => o.status === 'cancelado').length;

  // Tempo médio (em minutos)
  const withTime = allForTech.filter(o => o.started_at && o.finished_at);
  const avgMin = withTime.length > 0
    ? Math.round(withTime.reduce((acc, o) => {
        const diff = (new Date(o.finished_at) - new Date(o.started_at)) / 60000;
        return acc + diff;
      }, 0) / withTime.length)
    : 0;

  res.json({ orders, summary: { total, concluidas, canceladas, avgMin } });
});

router.get('/client/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const client = db.prepare(`SELECT c.*, u.name as seller_name, p.name as plan_name, p.speed, p.price
    FROM clients c LEFT JOIN users u ON u.id=c.seller_id LEFT JOIN plans p ON p.id=c.plan_id WHERE c.id=?`).get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Não encontrado' });
  const orders = db.prepare(`SELECT so.*, t.name as tech_name FROM service_orders so
    LEFT JOIN users t ON t.id=so.technician_id WHERE so.client_id=? ORDER BY so.created_at DESC`).all(req.params.id);
  res.json({ client, orders });
});

module.exports = router;
