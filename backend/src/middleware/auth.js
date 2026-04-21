const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jdtelecom_gold_fibra_secret_2024';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;

    // Verifica se é sessão ativa (1 dispositivo por login)
    try {
      const { getDb } = require('../database');
      const db = getDb();
      const row = db.prepare('SELECT active_token FROM users WHERE id=?').get(decoded.id);
      if (row && row.active_token && row.active_token !== token) {
        return res.status(401).json({ error: 'session_replaced', message: '🔒 Sua sessão foi encerrada. Outro dispositivo acessou sua conta.' });
      }
    } catch {}

    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  next();
}

function techOrAdmin(req, res, next) {
  if (!['admin','tecnico'].includes(req.user.role)) return res.status(403).json({ error: 'Acesso negado. Apenas técnicos e administradores.' });
  next();
}

function sellerOrAdmin(req, res, next) {
  if (!['admin','vendedor'].includes(req.user.role)) return res.status(403).json({ error: 'Acesso negado. Apenas vendedores e administradores.' });
  next();
}

function notTech(req, res, next) {
  if (req.user.role === 'tecnico') return res.status(403).json({ error: 'Acesso negado. Técnicos não têm permissão.' });
  next();
}

module.exports = { authMiddleware, adminOnly, techOrAdmin, sellerOrAdmin, notTech, JWT_SECRET };
