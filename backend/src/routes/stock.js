const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Normaliza MAC: maiúsculo sem separadores
function normalizeMac(mac) {
  return mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
}

function formatMac(mac) {
  const clean = normalizeMac(mac);
  return clean.match(/.{1,2}/g)?.join(':') || clean;
}

function log(db, stock_id, tech_id, action, extra = {}) {
  try {
    db.prepare(`INSERT INTO tech_stock_log (stock_id, tech_id, action, client_id, os_id, obs)
      VALUES (?,?,?,?,?,?)`).run(stock_id, tech_id, action, extra.client_id || null, extra.os_id || null, extra.obs || null);
  } catch (_) {}
}

// ── GET /api/stock — lista estoque ─────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const isAdmin = req.user.role === 'admin';
  const { tech_id, status } = req.query;

  let sql = `
    SELECT ts.*, u.name as tech_name, u.jd_id,
           c.name as client_name
    FROM tech_stock ts
    JOIN users u ON u.id = ts.tech_id
    LEFT JOIN clients c ON c.id = ts.client_id
    WHERE 1=1
  `;
  const params = [];

  if (!isAdmin) {
    sql += ' AND ts.tech_id = ?'; params.push(req.user.id);
  } else if (tech_id) {
    sql += ' AND ts.tech_id = ?'; params.push(tech_id);
  }
  if (status) { sql += ' AND ts.status = ?'; params.push(status); }
  sql += ' ORDER BY ts.created_at DESC';

  const items = db.prepare(sql).all(...params);
  res.json(items);
});

// ── GET /api/stock/my — estoque do técnico logado ──────────────────────────
router.get('/my', authMiddleware, (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT ts.*, c.name as client_name
    FROM tech_stock ts LEFT JOIN clients c ON c.id = ts.client_id
    WHERE ts.tech_id = ? ORDER BY ts.created_at DESC
  `).all(req.user.id);

  const summary = {
    disponivel: items.filter(i => i.status === 'disponivel').length,
    utilizado:  items.filter(i => i.status === 'utilizado').length,
    defeito:    items.filter(i => i.status === 'defeito').length,
    total: items.length,
  };
  res.json({ items, summary });
});

// ── GET /api/stock/check/:mac — verifica MAC ───────────────────────────────
router.get('/check/:mac', authMiddleware, (req, res) => {
  const db = getDb();
  const mac = formatMac(req.params.mac);
  const norm = normalizeMac(req.params.mac);
  const item = db.prepare(`
    SELECT ts.*, u.name as tech_name, c.name as client_name
    FROM tech_stock ts
    JOIN users u ON u.id = ts.tech_id
    LEFT JOIN clients c ON c.id = ts.client_id
    WHERE ts.mac_address = ?
  `).get(mac);

  if (!item) return res.json({ found: false, mac });

  // Técnico só pode ver o próprio
  if (req.user.role !== 'admin' && item.tech_id !== req.user.id) {
    return res.json({ found: false, mac, reason: 'not_yours' });
  }
  res.json({ found: true, ...item });
});

// ── GET /api/stock/log — histórico ────────────────────────────────────────
router.get('/log', authMiddleware, (req, res) => {
  const db = getDb();
  const isAdmin = req.user.role === 'admin';
  let sql = `
    SELECT l.*, u.name as tech_name, c.name as client_name,
           ts.mac_address, ts.modelo
    FROM tech_stock_log l
    JOIN users u ON u.id = l.tech_id
    LEFT JOIN clients c ON c.id = l.client_id
    LEFT JOIN tech_stock ts ON ts.id = l.stock_id
    WHERE 1=1
  `;
  const params = [];
  if (!isAdmin) { sql += ' AND l.tech_id = ?'; params.push(req.user.id); }
  sql += ' ORDER BY l.created_at DESC LIMIT 200';
  res.json(db.prepare(sql).all(...params));
});

// ── POST /api/stock — cadastrar uma ONU ───────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { mac_address, modelo, serial, obs } = req.body;
  let { tech_id } = req.body;

  if (!mac_address && !serial) return res.status(400).json({ error: 'Informe o MAC ou o Serial da ONU' });
  const mac = mac_address ? formatMac(mac_address) : '';
  if (mac_address && mac.length < 12) return res.status(400).json({ error: 'MAC Address inválido' });

  // Somente admin pode cadastrar ONU
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Somente o administrador pode cadastrar ONUs' });
  if (!tech_id) return res.status(400).json({ error: 'Informe o técnico destino' });

  // Verifica se MAC já existe
  const exists = db.prepare('SELECT id FROM tech_stock WHERE mac_address=?').get(mac);
  if (exists) return res.status(409).json({ error: `MAC ${mac} já cadastrado no estoque` });

  const r = db.prepare(`INSERT INTO tech_stock (tech_id, mac_address, modelo, serial, obs, status)
    VALUES (?,?,?,?,?,'disponivel')`).run(tech_id, mac, modelo || null, serial || null, obs || null);

  log(db, r.lastInsertRowid, tech_id, 'entrada', { obs: `Cadastro manual por ${req.user.name}` });
  res.json({ message: 'ONU cadastrada com sucesso', mac, id: r.lastInsertRowid });
});

// ── POST /api/stock/batch — cadastro em lote ──────────────────────────────
router.post('/batch', authMiddleware, (req, res) => {
  const db = getDb();
  const { items } = req.body; // [{mac_address, modelo, serial}]
  let { tech_id } = req.body;

  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Informe os itens' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Somente o administrador pode cadastrar ONUs' });
  if (!tech_id) return res.status(400).json({ error: 'Informe o técnico destino' });

  const results = { ok: [], errors: [] };
  for (const item of items) {
    if (!item.mac_address) { results.errors.push({ item, reason: 'MAC ausente' }); continue; }
    const mac = formatMac(item.mac_address);
    if (mac.length < 12) { results.errors.push({ mac, reason: 'MAC inválido' }); continue; }
    const exists = db.prepare('SELECT id FROM tech_stock WHERE mac_address=?').get(mac);
    if (exists) { results.errors.push({ mac, reason: 'Já cadastrado' }); continue; }
    try {
      const r = db.prepare(`INSERT INTO tech_stock (tech_id, mac_address, modelo, serial, status)
        VALUES (?,?,?,?,'disponivel')`).run(tech_id, mac, item.modelo || null, item.serial || null);
      log(db, r.lastInsertRowid, tech_id, 'entrada', { obs: 'Cadastro em lote' });
      results.ok.push(mac);
    } catch (e) { results.errors.push({ mac, reason: e.message }); }
  }
  res.json({ message: `${results.ok.length} ONUs cadastradas, ${results.errors.length} erros`, ...results });
});

// ── POST /api/stock/use — baixa da ONU (vincular ao cliente) ──────────────
router.post('/use', authMiddleware, (req, res) => {
  const db = getDb();
  const { mac_address, os_id, client_id } = req.body;
  if (!mac_address || !client_id) return res.status(400).json({ error: 'MAC e cliente obrigatórios' });

  const mac = formatMac(mac_address);
  const item = db.prepare('SELECT * FROM tech_stock WHERE mac_address=?').get(mac);

  if (!item) return res.status(404).json({ error: `ONU ${mac} não encontrada no estoque` });
  if (item.status === 'utilizado') return res.status(409).json({ error: `ONU ${mac} já está em uso pelo cliente ${item.client_id}` });
  if (item.status === 'defeito') return res.status(409).json({ error: `ONU ${mac} está marcada como defeito` });
  if (req.user.role !== 'admin' && item.tech_id !== req.user.id) return res.status(403).json({ error: 'Esta ONU não está no seu estoque' });

  // Baixar do estoque
  db.prepare(`UPDATE tech_stock SET status='utilizado', client_id=?, os_id=?, used_at=datetime('now') WHERE id=?`)
    .run(client_id, os_id || null, item.id);

  // Vincular ao cliente
  try { db.prepare('ALTER TABLE clients ADD COLUMN onu_mac TEXT').run(); } catch (_) {}
  try { db.prepare('ALTER TABLE clients ADD COLUMN onu_modelo TEXT').run(); } catch (_) {}
  db.prepare('UPDATE clients SET onu_mac=?, onu_modelo=? WHERE id=?').run(mac, item.modelo || null, client_id);

  log(db, item.id, item.tech_id, 'saida', { client_id, os_id, obs: `Instalada pelo técnico ${req.user.name}` });

  res.json({ message: `ONU ${mac} vinculada ao cliente com sucesso`, mac, modelo: item.modelo });
});

// ── POST /api/stock/assign — admin transfere ONU entre técnicos ───────────
router.post('/assign', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { stock_id, tech_id } = req.body;
  if (!stock_id || !tech_id) return res.status(400).json({ error: 'stock_id e tech_id obrigatórios' });

  const item = db.prepare('SELECT * FROM tech_stock WHERE id=?').get(stock_id);
  if (!item) return res.status(404).json({ error: 'ONU não encontrada' });
  if (item.status === 'utilizado') return res.status(409).json({ error: 'ONU já está em uso' });

  const old_tech = item.tech_id;
  db.prepare('UPDATE tech_stock SET tech_id=? WHERE id=?').run(tech_id, stock_id);
  log(db, stock_id, tech_id, 'transferencia', { obs: `Transferida de técnico ${old_tech} para ${tech_id} por admin ${req.user.name}` });

  res.json({ message: 'ONU transferida com sucesso' });
});

// ── PUT /api/stock/:id — atualizar status (defeito, obs) ──────────────────
router.put('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, obs } = req.body;
  const item = db.prepare('SELECT * FROM tech_stock WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'ONU não encontrada' });
  if (req.user.role !== 'admin' && item.tech_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });

  const validStatus = ['disponivel', 'utilizado', 'defeito'];
  if (status && !validStatus.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  db.prepare('UPDATE tech_stock SET status=COALESCE(?,status), obs=COALESCE(?,obs) WHERE id=?')
    .run(status || null, obs || null, req.params.id);

  if (status === 'defeito') log(db, item.id, item.tech_id, 'defeito', { obs });
  res.json({ message: 'Atualizado com sucesso' });
});

// ── DELETE /api/stock/:id — remover ONU ───────────────────────────────────
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM tech_stock WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'ONU não encontrada' });
  if (item.status === 'utilizado') return res.status(409).json({ error: 'Não é possível remover ONU em uso' });
  db.prepare('DELETE FROM tech_stock WHERE id=?').run(req.params.id);
  res.json({ message: 'ONU removida do estoque' });
});

module.exports = router;
