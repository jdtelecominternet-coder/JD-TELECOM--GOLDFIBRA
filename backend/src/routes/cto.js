const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Técnico registra ocorrência de CTO
router.post('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { os_id, cto_number, problem_type, photos, latitude, longitude, geo_address, observations } = req.body;

  if (!cto_number || !problem_type) {
    return res.status(400).json({ error: 'Número da CTO e tipo de problema são obrigatórios' });
  }
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'Pelo menos 1 foto é obrigatória' });
  }

  const result = db.prepare(`
    INSERT INTO cto_occurrences (os_id, technician_id, cto_number, problem_type, photos, latitude, longitude, geo_address, observations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    os_id || null,
    req.user.id,
    cto_number,
    problem_type,
    JSON.stringify(photos),
    latitude || null,
    longitude || null,
    geo_address || null,
    observations || null
  );

  // Notificar admin via socket
  const io = req.app.get('io');
  if (io) {
    io.emit('cto:nova_ocorrencia', {
      id: result.lastInsertRowid,
      cto_number,
      problem_type,
      tech_name: req.user.name,
      created_at: new Date().toISOString()
    });
  }

  res.json({ message: 'Ocorrência registrada com sucesso', id: result.lastInsertRowid });
});

// Admin lista ocorrências
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { tech_id, problem_type, cto_number, from, to } = req.query;

  let q = `SELECT co.*, u.name as tech_name, u.jd_id as tech_login,
    so.os_number, so.readable_id
    FROM cto_occurrences co
    LEFT JOIN users u ON u.id = co.technician_id
    LEFT JOIN service_orders so ON so.id = co.os_id
    WHERE 1=1`;
  const params = [];

  if (tech_id) { q += ' AND co.technician_id=?'; params.push(tech_id); }
  if (problem_type) { q += ' AND co.problem_type=?'; params.push(problem_type); }
  if (cto_number) { q += ' AND co.cto_number LIKE ?'; params.push('%' + cto_number + '%'); }
  if (from) { q += ' AND co.created_at >= ?'; params.push(from); }
  if (to) { q += ' AND co.created_at <= ?'; params.push(to + ' 23:59:59'); }

  q += ' ORDER BY co.created_at DESC';

  res.json(db.prepare(q).all(...params));
});

// Admin delete ocorrência
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM cto_occurrences WHERE id=?').run(req.params.id);
  res.json({ message: 'Ocorrência removida' });
});

module.exports = router;
