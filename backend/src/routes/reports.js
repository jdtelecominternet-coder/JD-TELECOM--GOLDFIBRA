const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/sales', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { seller_id, from, to } = req.query;
  let q = `SELECT c.name as client_name, c.cpf, c.status as client_status,
    p.name as plan_name, p.speed, p.price, u.name as seller_name, u.jd_id as seller_jd_id, c.created_at
    FROM clients c JOIN plans p ON p.id=c.plan_id JOIN users u ON u.id=c.seller_id WHERE 1=1`;
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
    so.drop_meters, so.drop_total, so.mat_esticador, so.mat_conector, so.mat_bucha, so.mat_fixa_cabo,
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
