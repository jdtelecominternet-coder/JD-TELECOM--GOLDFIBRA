const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Armazena challenges temporários (em memória, expira em 2min)
const challenges = new Map();
function cleanChallenges() {
  const now = Date.now();
  for (const [k, v] of challenges) {
    if (now - v.ts > 120000) challenges.delete(k);
  }
}

// POST /api/auth/webauthn/challenge — gera desafio
router.post('/challenge', (req, res) => {
  cleanChallenges();
  const challenge = crypto.randomBytes(32);
  const id = crypto.randomBytes(16).toString('hex');
  challenges.set(id, { buf: challenge, ts: Date.now() });
  const b64 = challenge.toString('base64url');
  res.json({ challenge: b64, challengeId: id });
});

// POST /api/auth/webauthn/register — salva credencial biométrica (requer login)
router.post('/register', authMiddleware, (req, res) => {
  const db = getDb();
  const { credentialId, publicKey, challengeId } = req.body;
  if (!credentialId || !publicKey) return res.status(400).json({ error: 'Dados incompletos' });

  // Garante coluna existe
  try { db.prepare("ALTER TABLE users ADD COLUMN webauthn_cred TEXT").run(); } catch {}
  try { db.prepare("ALTER TABLE users ADD COLUMN webauthn_pubkey TEXT").run(); } catch {}

  const existing = db.prepare('SELECT webauthn_cred FROM users WHERE id=?').get(req.user.id);
  let creds = [];
  try { creds = JSON.parse(existing?.webauthn_cred || '[]'); } catch {}

  // Adiciona nova credencial (máx 3 por usuário)
  creds = creds.filter(c => c.id !== credentialId);
  creds.unshift({ id: credentialId, pubkey: publicKey, ts: Date.now() });
  if (creds.length > 3) creds = creds.slice(0, 3);

  db.prepare('UPDATE users SET webauthn_cred=?, webauthn_pubkey=? WHERE id=?')
    .run(JSON.stringify(creds), publicKey, req.user.id);

  res.json({ ok: true });
});

// POST /api/auth/webauthn/login — autentica com biometria
router.post('/login', (req, res) => {
  const db = getDb();
  const { credentialId } = req.body;
  if (!credentialId) return res.status(400).json({ error: 'credentialId obrigatório' });

  // Garante colunas existem
  try { db.prepare("ALTER TABLE users ADD COLUMN webauthn_cred TEXT").run(); } catch {}
  try { db.prepare("ALTER TABLE users ADD COLUMN active_token TEXT").run(); } catch {}

  // Busca usuário pela credencial
  const users = db.prepare("SELECT * FROM users WHERE webauthn_cred IS NOT NULL AND active=1").all();
  let foundUser = null;
  for (const u of users) {
    try {
      const creds = JSON.parse(u.webauthn_cred || '[]');
      if (creds.find(c => c.id === credentialId)) { foundUser = u; break; }
    } catch {}
  }

  if (!foundUser) return res.status(401).json({ error: 'Biometria não reconhecida. Use sua senha.' });

  // Biometria válida — gera token
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = jwt.sign(
    { id: foundUser.id, jd_id: foundUser.jd_id, name: foundUser.name, role: foundUser.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Atualiza sessão ativa
  db.prepare('UPDATE users SET active_token=? WHERE id=?').run(token, foundUser.id);

  let permissions = null;
  try { permissions = JSON.parse(foundUser.permissions || 'null'); } catch {}

  res.json({
    token,
    user: { id: foundUser.id, jd_id: foundUser.jd_id, name: foundUser.name, role: foundUser.role, photo_url: foundUser.photo_url, permissions }
  });
});

// DELETE /api/auth/webauthn/revoke — remove biometria do usuário
router.delete('/revoke', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    db.prepare("UPDATE users SET webauthn_cred=NULL, webauthn_pubkey=NULL WHERE id=?").run(req.user.id);
  } catch {}
  res.json({ ok: true });
});

module.exports = router;
