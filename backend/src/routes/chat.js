const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/chat/contacts — lista admins/tecnicos para conversar
router.get('/contacts', authMiddleware, (req, res) => {
  if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();

  let rows;
  if (req.user.role === 'admin') {
    // Admin vê todos os técnicos
    rows = db.prepare(`SELECT id, jd_id, name, role, photo_url FROM users
      WHERE role='tecnico' AND active=1 AND id != ? ORDER BY name`).all(req.user.id);
  } else {
    // Técnico vê apenas admins
    rows = db.prepare(`SELECT id, jd_id, name, role, photo_url FROM users
      WHERE role='admin' AND active=1 AND id != ? ORDER BY name`).all(req.user.id);
  }

  // Add unread count per contact
  const withUnread = rows.map(u => {
    const unread = db.prepare(`SELECT COUNT(*) as c FROM chat_messages
      WHERE sender_id=? AND receiver_id=? AND read_at IS NULL`).get(u.id, req.user.id);
    return { ...u, unread: unread?.c || 0 };
  });

  res.json(withUnread);
});

// GET /api/chat/history/:with_user_id
router.get('/history/:with_user_id', authMiddleware, (req, res) => {
  if (!['admin', 'tecnico'].includes(req.user.role)) return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();
  const wid = req.params.with_user_id;

  const msgs = db.prepare(`
    SELECT m.*, u.name as sender_name, u.jd_id as sender_jd_id, u.photo_url as sender_photo
    FROM chat_messages m JOIN users u ON u.id=m.sender_id
    WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
    ORDER BY m.created_at ASC LIMIT 100
  `).all(req.user.id, wid, wid, req.user.id);

  // Mark as read
  db.prepare(`UPDATE chat_messages SET read_at=datetime('now')
    WHERE receiver_id=? AND sender_id=? AND read_at IS NULL`).run(req.user.id, wid);

  res.json(msgs);
});

// GET /api/chat/unread — total de msgs não lidas
router.get('/unread', authMiddleware, (req, res) => {
  if (!['admin', 'tecnico'].includes(req.user.role)) return res.json({ total: 0 });
  const db = getDb();
  const r = db.prepare(`SELECT COUNT(*) as c FROM chat_messages WHERE receiver_id=? AND read_at IS NULL`).get(req.user.id);
  res.json({ total: r?.c || 0 });
});

module.exports = router;
