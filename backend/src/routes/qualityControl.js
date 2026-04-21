const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Monta JSON com fotos da OS a partir das colunas individuais
function buildTechPhotos(so) {
  const fields = ['photo_cto', 'photo_signal_cto', 'photo_meter', 'photo_onu',
    'photo_speedtest', 'photo_cto_open', 'photo_cto_closed', 'photo_mac'];
  const photos = fields.map(f => so[f]).filter(Boolean);
  return JSON.stringify(photos);
}

// GET /api/quality-control
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT qc.*,
        so.readable_id, so.os_number, so.status as os_status,
        so.scheduled_date, so.tipo_ordem_servico, so.valor_servico,
        so.observations, so.tech_observations,
        so.photo_cto, so.photo_signal_cto, so.photo_meter, so.photo_onu,
        so.photo_speedtest, so.photo_cto_open, so.photo_cto_closed, so.photo_mac,
        so.latitude, so.longitude, so.geo_address,
        c.name as client_name, c.whatsapp as client_whatsapp,
        c.street, c.number as addr_number, c.neighborhood, c.city, c.state,
        u.name as tech_name, u.jd_id as tech_jd_id,
        sup.name as supervisor_name
      FROM quality_control qc
      JOIN service_orders so ON so.id = qc.os_id
      LEFT JOIN clients c ON c.id = so.client_id
      LEFT JOIN users u ON u.id = so.technician_id
      LEFT JOIN users sup ON sup.id = qc.supervisor_id
      ORDER BY qc.created_at DESC
    `).all();
    const result = rows.map(r => ({ ...r, tech_photos: buildTechPhotos(r) }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-control/vistoria
router.get('/vistoria', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT qc.*,
        so.readable_id, so.os_number, so.status as os_status,
        so.scheduled_date, so.tipo_ordem_servico, so.valor_servico,
        so.observations, so.tech_observations,
        so.photo_cto, so.photo_signal_cto, so.photo_meter, so.photo_onu,
        so.photo_speedtest, so.photo_cto_open, so.photo_cto_closed, so.photo_mac,
        c.name as client_name, c.street, c.number as addr_number,
        c.neighborhood, c.city, c.state,
        u.name as tech_name, u.jd_id as tech_jd_id,
        sup.name as supervisor_name
      FROM quality_control qc
      JOIN service_orders so ON so.id = qc.os_id
      LEFT JOIN clients c ON c.id = so.client_id
      LEFT JOIN users u ON u.id = so.technician_id
      LEFT JOIN users sup ON sup.id = qc.supervisor_id
      WHERE qc.status = 'retornado' AND so.technician_id = ?
      ORDER BY qc.created_at DESC
    `).all(req.user.id);
    const result = rows.map(r => ({ ...r, tech_photos: buildTechPhotos(r) }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-control/approve/:id
router.post('/approve/:id', (req, res) => {
  try {
    const db = getDb();
    const qc = db.prepare('SELECT * FROM quality_control WHERE id=?').get(req.params.id);
    if (!qc) return res.status(404).json({ error: 'Registro CQ não encontrado' });

    db.prepare(`UPDATE quality_control SET status='aprovado', supervisor_id=?, supervisor_obs=?, updated_at=datetime('now') WHERE id=?`)
      .run(req.user.id, req.body.obs || null, req.params.id);

    db.prepare(`UPDATE service_orders SET status_pagamento_tecnico='a_receber' WHERE id=?`)
      .run(qc.os_id);

    req.app.get('io')?.emit('data:refresh', { type: 'quality_control' });
    req.app.get('io')?.emit('data:refresh', { type: 'orders' });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-control/return/:id
router.post('/return/:id', (req, res) => {
  try {
    const { obs, photos } = req.body;
    if (!obs?.trim()) return res.status(400).json({ error: 'Observação obrigatória ao retornar' });
    const db = getDb();
    const qc = db.prepare('SELECT * FROM quality_control WHERE id=?').get(req.params.id);
    if (!qc) return res.status(404).json({ error: 'Registro CQ não encontrado' });

    db.prepare(`UPDATE quality_control SET status='retornado', supervisor_id=?, supervisor_obs=?, supervisor_photos=?, updated_at=datetime('now') WHERE id=?`)
      .run(req.user.id, obs, photos ? JSON.stringify(photos) : null, req.params.id);

    db.prepare(`UPDATE service_orders SET status='em_andamento' WHERE id=?`).run(qc.os_id);

    const so = db.prepare('SELECT technician_id FROM service_orders WHERE id=?').get(qc.os_id);
    req.app.get('io')?.emit('data:refresh', { type: 'quality_control' });
    req.app.get('io')?.emit('os:retornada', { tech_id: so?.technician_id, os_id: qc.os_id });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-control/correction/:id
router.post('/correction/:id', (req, res) => {
  try {
    const { obs, photos } = req.body;
    const db = getDb();
    const qc = db.prepare('SELECT * FROM quality_control WHERE id=?').get(req.params.id);
    if (!qc) return res.status(404).json({ error: 'Registro CQ não encontrado' });

    db.prepare(`UPDATE quality_control SET status='aguardando', tech_obs=?, tech_correction_photos=?, cycle=cycle+1, supervisor_obs=NULL, supervisor_photos=NULL, updated_at=datetime('now') WHERE id=?`)
      .run(obs || null, photos ? JSON.stringify(photos) : null, req.params.id);

    db.prepare(`UPDATE service_orders SET status='finalizado' WHERE id=?`).run(qc.os_id);

    const io = req.app.get('io');
    io?.emit('data:refresh', { type: 'quality_control' });
    io?.emit('os:corrigida', { os_id: qc.os_id, qc_id: qc.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-control/em-rota/:id
router.post('/em-rota/:id', (req, res) => {
  try {
    const db = getDb();
    const qc = db.prepare('SELECT * FROM quality_control WHERE id=?').get(req.params.id);
    if (!qc) return res.status(404).json({ error: 'Registro não encontrado' });
    const { latitude, longitude } = req.body;
    // correction_status pode não existir no banco antigo — ignora erro
    try { db.prepare(`UPDATE quality_control SET correction_status='em_rota' WHERE id=?`).run(req.params.id); } catch(_) {}
    try {
      if (latitude && longitude) {
        db.prepare(`UPDATE service_orders SET status='em_deslocamento', latitude=?, longitude=? WHERE id=?`).run(latitude, longitude, qc.os_id);
      } else {
        db.prepare(`UPDATE service_orders SET status='em_deslocamento' WHERE id=?`).run(qc.os_id);
      }
    } catch(_) {}
    req.app.get('io')?.emit('data:refresh', { type: 'quality_control' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/quality-control/iniciar/:id
router.post('/iniciar/:id', (req, res) => {
  try {
    const db = getDb();
    const qc = db.prepare('SELECT * FROM quality_control WHERE id=?').get(req.params.id);
    if (!qc) return res.status(404).json({ error: 'Registro não encontrado' });
    const { latitude, longitude } = req.body;
    try { db.prepare(`UPDATE quality_control SET correction_status='em_correcao' WHERE id=?`).run(req.params.id); } catch(_) {}
    try {
      if (latitude && longitude) {
        db.prepare(`UPDATE service_orders SET status='em_execucao', latitude=?, longitude=? WHERE id=?`).run(latitude, longitude, qc.os_id);
      } else {
        db.prepare(`UPDATE service_orders SET status='em_execucao' WHERE id=?`).run(qc.os_id);
      }
    } catch(_) {}
    req.app.get('io')?.emit('data:refresh', { type: 'quality_control' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
