const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly, techOrAdmin, sellerOrAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/photos')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `os_${req.params.id}_${file.fieldname}_${Date.now()}${ext}`);
  }
});
const uploadPhotos = multer({ storage: photoStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Gera OS número interno
function generateOSNumber(db) {
  let os_number;
  do {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    os_number = `OS${date}${rand}`;
  } while (db.prepare('SELECT id FROM service_orders WHERE os_number=?').get(os_number));
  return os_number;
}

// Gera ID Digitável: ex. JD-2401-4827
function generateReadableId(db) {
  let rid;
  do {
    const yy = String(new Date().getFullYear()).slice(2);
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    rid = `JD-${yy}${mm}-${rand}`;
  } while (db.prepare('SELECT id FROM service_orders WHERE readable_id=?').get(rid));
  return rid;
}

const osQuery = `SELECT so.*,
  c.name as client_name, c.whatsapp as client_whatsapp, c.street as client_street,
  c.number as client_number, c.neighborhood as client_neighborhood,
  c.city as client_city, c.state as client_state, c.cpf as client_cpf,
  p.name as plan_name, p.speed as plan_speed, p.price as plan_price,
  t.name as technician_name, t.jd_id as technician_jd_id,
  s.name as seller_name, s.jd_id as seller_jd_id,
  so.gold_fibra_id
  FROM service_orders so
  JOIN clients c ON c.id=so.client_id
  JOIN plans p ON p.id=so.plan_id
  LEFT JOIN users t ON t.id=so.technician_id
  LEFT JOIN users s ON s.id=so.seller_id`;

router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  let rows;
  if (req.user.role === 'admin')        rows = db.prepare(osQuery + ' ORDER BY so.created_at DESC').all();
  else if (req.user.role === 'tecnico') rows = db.prepare(osQuery + ' WHERE so.technician_id=? ORDER BY so.created_at DESC').all(req.user.id);
  else                                  rows = db.prepare(osQuery + ' WHERE so.seller_id=? ORDER BY so.created_at DESC').all(req.user.id);
  res.json(rows);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const row = db.prepare(osQuery + ' WHERE so.id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'OS não encontrada' });
  res.json(row);
});

// Histórico de transferências de uma OS
router.get('/:id/transfers', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*, u1.name as from_name, u1.jd_id as from_jd_id,
           u2.name as to_name, u2.jd_id as to_jd_id
    FROM os_transfers t
    LEFT JOIN users u1 ON u1.id=t.from_user_id
    LEFT JOIN users u2 ON u2.id=t.to_user_id
    WHERE t.os_id=?
    ORDER BY t.transferred_at DESC
  `).all(req.params.id);
  res.json(rows);
});

router.post('/', authMiddleware, sellerOrAdmin, (req, res) => {
  const db = getDb();
  const { client_id, plan_id, technician_id, scheduled_date, observations, seller_id, gold_fibra_id } = req.body;
  if (!client_id || !plan_id) return res.status(400).json({ error: 'Cliente e plano obrigatórios' });

  const os_number  = generateOSNumber(db);
  const readable_id = generateReadableId(db);
  const sid = req.user.role === 'vendedor' ? req.user.id : (seller_id || req.user.id);

  const info = db.prepare(`INSERT INTO service_orders
    (os_number, readable_id, client_id, plan_id, technician_id, seller_id, scheduled_date, observations, gold_fibra_id)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(os_number, readable_id, client_id, plan_id, technician_id || null, sid, scheduled_date || null, observations || null, gold_fibra_id || null);

  // Registra transferência inicial se já foi atribuído a um técnico
  if (technician_id) {
    db.prepare(`INSERT INTO os_transfers (os_id, from_user_id, to_user_id, reason) VALUES (?,?,?,?)`)
      .run(info.lastInsertRowid, sid, technician_id, 'Atribuição inicial');
  }

  res.json({ id: info.lastInsertRowid, os_number, readable_id, message: 'OS criada' });
});

// Transferir / Manobrar OS
router.post('/:id/transfer', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { to_user_id, reason } = req.body;
  if (!to_user_id) return res.status(400).json({ error: 'Usuário destino obrigatório' });

  const os = db.prepare('SELECT * FROM service_orders WHERE id=?').get(req.params.id);
  if (!os) return res.status(404).json({ error: 'OS não encontrada' });

  const target = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(to_user_id);
  if (!target) return res.status(404).json({ error: 'Usuário destino não encontrado' });

  const fromId = os.technician_id || os.seller_id;

  db.prepare('UPDATE service_orders SET technician_id=? WHERE id=?').run(to_user_id, req.params.id);
  db.prepare(`INSERT INTO os_transfers (os_id, from_user_id, to_user_id, reason) VALUES (?,?,?,?)`)
    .run(req.params.id, fromId, to_user_id, reason || 'Manobra de OS');

  res.json({ message: `OS transferida para ${target.name}` });
});

// Salvar geolocalização
router.put('/:id/geo', authMiddleware, techOrAdmin, (req, res) => {
  const db = getDb();
  const { latitude, longitude, geo_address } = req.body;
  if (!latitude || !longitude) return res.status(400).json({ error: 'Coordenadas obrigatórias' });

  db.prepare('UPDATE service_orders SET latitude=?, longitude=?, geo_address=? WHERE id=?')
    .run(latitude, longitude, geo_address || null, req.params.id);
  res.json({ message: 'Localização salva' });
});

router.put('/:id/status', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, observations } = req.body;
  const os = db.prepare('SELECT * FROM service_orders WHERE id=?').get(req.params.id);
  if (!os) return res.status(404).json({ error: 'OS não encontrada' });
  if (req.user.role === 'vendedor') return res.status(403).json({ error: 'Acesso negado' });
  if (req.user.role === 'tecnico' && os.technician_id !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

  if (status === 'finalizado') {
    const photos = ['photo_cto_open','photo_cto_closed','photo_signal_cto','photo_meter','photo_mac','photo_onu','photo_speedtest'];
    const missing = photos.filter(f => !os[f]);
    if (missing.length > 0) return res.status(400).json({ error: `Fotos obrigatórias pendentes: ${missing.length} foto(s)` });
  }

  db.prepare('UPDATE service_orders SET status=?, observations=? WHERE id=?')
    .run(status, observations || os.observations, req.params.id);

  if (status === 'finalizado') {
    db.prepare('UPDATE clients SET status=? WHERE id=?').run('ativo', os.client_id);
    db.prepare("UPDATE service_orders SET finished_at=datetime('now'), payment_seller_status='a_receber', payment_tech_status='pendente' WHERE id=?").run(req.params.id);
  } else if (status === 'cancelado') {
    db.prepare('UPDATE clients SET status=? WHERE id=?').run('cancelado', os.client_id);
  }
  res.json({ message: 'Status atualizado' });
});

router.put('/:id/reassign', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { technician_id } = req.body;
  const os = db.prepare('SELECT * FROM service_orders WHERE id=?').get(req.params.id);
  if (!os) return res.status(404).json({ error: 'OS não encontrada' });

  db.prepare('UPDATE service_orders SET technician_id=? WHERE id=?').run(technician_id, req.params.id);
  db.prepare(`INSERT INTO os_transfers (os_id, from_user_id, to_user_id, reason) VALUES (?,?,?,?)`)
    .run(req.params.id, os.technician_id, technician_id, 'Reatribuição administrativa');
  res.json({ message: 'Técnico reatribuído' });
});

router.put('/:id/technical', authMiddleware, (req, res) => {
  const db = getDb();
  const os = db.prepare('SELECT * FROM service_orders WHERE id=?').get(req.params.id);
  if (!os) return res.status(404).json({ error: 'OS não encontrada' });
  if (req.user.role === 'vendedor') return res.status(403).json({ error: 'Acesso negado' });
  if (req.user.role === 'tecnico' && os.technician_id !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

  const { drop_start, drop_end, mat_esticador, mat_conector, mat_bucha, mat_fixa_cabo, tech_observations } = req.body;
  const drop_total = (drop_start && drop_end) ? Math.abs(parseFloat(drop_end) - parseFloat(drop_start)) : os.drop_total;

  db.prepare(`UPDATE service_orders SET drop_start=?, drop_end=?, drop_total=?,
    mat_esticador=?, mat_conector=?, mat_bucha=?, mat_fixa_cabo=?, tech_observations=? WHERE id=?`)
    .run(drop_start || os.drop_start, drop_end || os.drop_end, drop_total,
      mat_esticador ?? os.mat_esticador, mat_conector ?? os.mat_conector,
      mat_bucha ?? os.mat_bucha, mat_fixa_cabo ?? os.mat_fixa_cabo,
      tech_observations || os.tech_observations, req.params.id);

  res.json({ message: 'Dados técnicos salvos', drop_total });
});

const PHOTO_FIELDS = ['photo_cto_open','photo_cto_closed','photo_signal_cto','photo_meter','photo_mac','photo_onu','photo_speedtest'];

router.post('/:id/photos', authMiddleware,
  uploadPhotos.fields(PHOTO_FIELDS.map(name => ({ name, maxCount: 1 }))),
  (req, res) => {
    const db = getDb();
    const os = db.prepare('SELECT * FROM service_orders WHERE id=?').get(req.params.id);
    if (!os) return res.status(404).json({ error: 'OS não encontrada' });
    if (req.user.role === 'vendedor') return res.status(403).json({ error: 'Acesso negado' });

    const updates = {};
    const files = req.files || {};
    for (const field of PHOTO_FIELDS) {
      if (files[field]) updates[field] = `/uploads/photos/${files[field][0].filename}`;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nenhuma foto enviada' });

    const sets = Object.keys(updates).map(k => `${k}=?`).join(', ');
    db.prepare(`UPDATE service_orders SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    res.json({ message: 'Fotos salvas', photos: updates });
  }
);

// PUT /api/orders/:id/payment — admin marca pagamento de vendedor e/ou técnico
router.put('/:id/payment', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { pay_seller, pay_tech } = req.body;
  const os = db.prepare('SELECT * FROM service_orders WHERE id=?').get(req.params.id);
  if (!os) return res.status(404).json({ error: 'OS não encontrada' });
  if (os.status !== 'finalizado') return res.status(400).json({ error: 'OS precisa estar finalizada para registrar pagamento' });

  if (pay_seller) db.prepare("UPDATE service_orders SET payment_seller_status='pago', payment_seller_at=datetime('now') WHERE id=?").run(req.params.id);
  if (pay_tech)   db.prepare("UPDATE service_orders SET payment_tech_status='pago', payment_tech_at=datetime('now') WHERE id=?").run(req.params.id);

  res.json({ message: 'Pagamento registrado' });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM service_orders WHERE id=?').run(req.params.id);
  res.json({ message: 'OS removida' });
});

module.exports = router;
