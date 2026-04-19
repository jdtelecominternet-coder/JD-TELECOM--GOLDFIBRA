const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const db = getDb();
  const { jd_id, password } = req.body;
  if (!jd_id || !password) return res.status(400).json({ error: 'ID e senha obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE jd_id = ? AND active = 1').get(jd_id.toUpperCase().trim());
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
    { id: user.id, jd_id: user.jd_id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: { id: user.id, jd_id: user.jd_id, name: user.name, role: user.role, photo_url: user.photo_url, permissions }
  });
});

module.exports = router;
