const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const db = getDb();
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'ID e senha obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(id.toUpperCase().trim());
  if (!user) return res.status(401).json({ error: 'ID ou senha inválidos' });

  const pw = db.prepare('SELECT hash FROM passwords WHERE user_id = ?').get(user.id);
  if (!pw) return res.status(401).json({ error: 'Senha não configurada' });

  const valid = bcrypt.compareSync(password, pw.hash);
  if (!valid) return res.status(401).json({ error: 'ID ou senha inválidos' });

  let permissions = null;
  if (user.permissions) {
    try { permissions = JSON.parse(user.permissions); } catch {}
  }

  const token = jwt.sign(
    { id: user.id, id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Garante coluna active_token existe
  try { db.prepare("ALTER TABLE users ADD COLUMN active_token TEXT").run(); } catch {}

  // Salva o novo token (derruba sessão anterior automaticamente)
  db.prepare('UPDATE users SET active_token=? WHERE id=?').run(token, user.id);

  res.json({
    token,
    user: { id: user.id, id: user.id, name: user.name, role: user.role, photo_url: user.photo_url, permissions }
  });
});

// Logout — limpa o token ativo
router.post('/logout', authMiddleware, (req, res) => {
  const db = getDb();
  try { db.prepare('UPDATE users SET active_token=NULL WHERE id=?').run(req.user.id); } catch {}
  res.json({ ok: true });
});

module.exports = router;

