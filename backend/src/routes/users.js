const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/profiles')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.user.id}_${Date.now()}${ext}`);
  }
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 } });

function uniqueJdId(db) {
  let id, exists;
  do {
    const nums = Math.floor(100000 + Math.random() * 900000).toString();
    id = 'JD' + nums;
    exists = db.prepare('SELECT id FROM users WHERE jd_id = ?').get(id);
  } while (exists);
  return id;
}

// POST /api/users/verify-admin-password — verifica senha do admin logado
router.post('/verify-admin-password', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Senha obrigatória' });
  // Verifica contra o admin principal: primeiro tenta jd_id '000001', depois menor id com role admin
  let mainAdmin = db.prepare("SELECT id FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1").get();
  if (!mainAdmin) return res.status(404).json({ error: 'Admin principal não encontrado' });
  const pw = db.prepare('SELECT hash FROM passwords WHERE user_id=?').get(mainAdmin.id);
  if (!pw) return res.status(404).json({ error: 'Senha não encontrada' });
  const ok = bcrypt.compareSync(password, pw.hash);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta. Ação não autorizada.' });
  res.json({ ok: true });
});

// GET /api/users/me - must come before /:id
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, jd_id, name, role, email, phone, photo_url, active, permissions FROM users WHERE id=?').get(req.user.id);
  if (user && user.permissions) {
    try { user.permissions = JSON.parse(user.permissions); } catch { user.permissions = null; }
  }
  res.json(user);
});

router.put('/me/profile', authMiddleware, (req, res) => {
  const db = getDb();
  const { email, phone } = req.body;
  db.prepare('UPDATE users SET email=?, phone=? WHERE id=?').run(email || null, phone || null, req.user.id);
  res.json({ message: 'Perfil atualizado' });
});

router.put('/me/password', authMiddleware, (req, res) => {
  const db = getDb();
  const { current_password, new_password } = req.body;
  const pw = db.prepare('SELECT hash FROM passwords WHERE user_id=?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, pw.hash)) return res.status(400).json({ error: 'Senha atual incorreta' });
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE passwords SET hash=? WHERE user_id=?').run(hash, req.user.id);
  res.json({ message: 'Senha alterada' });
});

router.post('/me/photo', authMiddleware, uploadProfile.single('photo'), (req, res) => {
  const db = getDb();
  if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório' });
  const url = `/uploads/profiles/${req.file.filename}`;
  db.prepare('UPDATE users SET photo_url=? WHERE id=?').run(url, req.user.id);
  res.json({ photo_url: url });
});

router.get('/me/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const role = req.user.role;
  let clients = [], orders = [];
  if (role === 'vendedor') {
    clients = db.prepare('SELECT * FROM clients WHERE seller_id=? ORDER BY created_at DESC').all(req.user.id);
    orders = db.prepare(`SELECT so.*, c.name as client_name, p.name as plan_name FROM service_orders so
      JOIN clients c ON c.id=so.client_id JOIN plans p ON p.id=so.plan_id
      WHERE so.seller_id=? ORDER BY so.created_at DESC`).all(req.user.id);
  } else if (role === 'tecnico') {
    orders = db.prepare(`SELECT so.*, c.name as client_name, p.name as plan_name FROM service_orders so
      JOIN clients c ON c.id=so.client_id LEFT JOIN plans p ON p.id=so.plan_id
      WHERE so.technician_id=? ORDER BY so.created_at DESC`).all(req.user.id);
  } else {
    clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC LIMIT 10').all();
    orders = db.prepare(`SELECT so.*, c.name as client_name FROM service_orders so
      JOIN clients c ON c.id=so.client_id ORDER BY so.created_at DESC LIMIT 10`).all();
  }
  res.json({ clients, orders });
});

// GET /api/users - admin only
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, jd_id, name, role, email, phone, photo_url, active, permissions, created_at FROM users ORDER BY name').all();
  res.json(users.map(u => ({
    ...u,
    permissions: u.permissions ? (() => { try { return JSON.parse(u.permissions); } catch { return null; } })() : null
  })));
});

// POST /api/users
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { name, role, password } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Nome e função obrigatórios' });
  if (!['admin','vendedor','tecnico','manutencao','qualidade'].includes(role)) return res.status(400).json({ error: 'Função inválida' });

  const jd_id = uniqueJdId(db);
  const hash = bcrypt.hashSync(password || 'jd1234', 10);

  const info = db.prepare('INSERT INTO users (jd_id, name, role) VALUES (?, ?, ?)').run(jd_id, name, role);
  db.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').run(info.lastInsertRowid, hash);

  res.json({ id: info.lastInsertRowid, jd_id, name, role, message: `ID: ${jd_id} | Senha: ${password || 'jd1234'}` });
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { name, role, active, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Proteção: admin principal (000001) nunca pode ser desativado
  if (user.jd_id === '000001' && active === false) {
    return res.status(403).json({ error: 'O Administrador Principal não pode ser desativado.' });
  }
  // Proteção: admin principal nunca pode ter o role alterado
  const newRole = (user.jd_id === '000001') ? 'admin' : (['admin','vendedor','tecnico','manutencao','qualidade'].includes(role) ? role : user.role);
  const newActive = (user.jd_id === '000001') ? 1 : (active !== undefined ? active : user.active);

  db.prepare('UPDATE users SET name=?, role=?, active=? WHERE id=?')
    .run(name || user.name, newRole, newActive, req.params.id);
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE passwords SET hash=? WHERE user_id=?').run(hash, req.params.id);
  }
  res.json({ message: 'Atualizado' });
});

// PUT /api/users/:id/permissions - admin sets custom permissions for a user
router.put('/:id/permissions', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const { permissions } = req.body;
  const permJson = permissions ? JSON.stringify(permissions) : null;
  db.prepare('UPDATE users SET permissions=? WHERE id=?').run(permJson, req.params.id);
  res.json({ message: 'Permissões atualizadas' });
});

// DELETE /api/users/:id - exclui permanentemente
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  // Proteção total: admin principal (000001) nunca pode ser excluído
  if (user.jd_id === '000001' || user.jd_id === 'JD000001') {
    return res.status(403).json({ error: '🔒 O Administrador Principal não pode ser excluído.' });
  }
  db.prepare('DELETE FROM passwords WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: `Usuário ${user.name} excluído permanentemente` });
});

// DELETE /api/users/:id/reset-os - zera todas as OS e valores do técnico
router.delete('/:id/reset-os', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.role !== 'tecnico') return res.status(400).json({ error: 'Apenas técnicos podem ter OS zeradas' });
  const n = db.prepare('DELETE FROM service_orders WHERE technician_id=?').run(req.params.id).changes;
  try { db.prepare("DELETE FROM sqlite_sequence WHERE name='service_orders'").run(); } catch(e) {}
  res.json({ message: `${n} OS do técnico ${user.name} apagadas com sucesso` });
});

// Store online status in memory (will be lost on restart, but that's OK for heartbeat)
const onlineUsers = new Map();
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds - user considered offline after 1 minute

// POST /api/users/heartbeat - receive heartbeat from users
router.post('/heartbeat', (req, res) => {
  const { userId, timestamp, deviceInfo } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  // Update user's last seen time
  onlineUsers.set(userId, {
    lastSeen: timestamp || Date.now(),
    deviceInfo: deviceInfo || {},
    isOnline: true
  });

  res.json({ success: true, serverTime: Date.now() });
});

// GET /api/users/online-status - get online status of users
router.get('/online-status', authMiddleware, (req, res) => {
  const now = Date.now();
  const statuses = {};

  for (const [userId, data] of onlineUsers.entries()) {
    const timeSinceLastSeen = now - data.lastSeen;
    // Consider online if heartbeat received in last 60 seconds
    statuses[userId] = {
      isOnline: timeSinceLastSeen < HEARTBEAT_TIMEOUT,
      lastSeen: data.lastSeen,
      secondsAgo: Math.floor(timeSinceLastSeen / 1000)
    };
  }

  res.json(statuses);
});

// GET /api/users/:id/online - check if specific user is online
router.get('/:id/online', authMiddleware, (req, res) => {
  const userId = req.params.id;
  const data = onlineUsers.get(userId);
  
  if (!data) {
    return res.json({ isOnline: false, lastSeen: null });
  }

  const timeSinceLastSeen = Date.now() - data.lastSeen;
  const isOnline = timeSinceLastSeen < HEARTBEAT_TIMEOUT;

  res.json({
    isOnline,
    lastSeen: data.lastSeen,
    secondsAgo: Math.floor(timeSinceLastSeen / 1000)
  });
});

module.exports = router;
