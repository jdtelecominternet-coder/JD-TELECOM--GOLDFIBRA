const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.get('/contacts', authMiddleware, (req, res) => {
  const db = getDb();
  let rows;
  if (req.user.role === 'admin') {
    rows = db.prepare(`SELECT id, jd_id, name, role, photo_url FROM users
      WHERE role IN ('tecnico','vendedor') AND active=1 AND id != ? ORDER BY role, name`).all(req.user.id);
  } else {
    rows = db.prepare(`SELECT id, jd_id, name, role, photo_url FROM users
      WHERE role='admin' AND active=1 AND id != ? ORDER BY name`).all(req.user.id);
  }
  const withUnread = rows.map(u => {
    const unread = db.prepare(`SELECT COUNT(*) as c FROM chat_messages
      WHERE sender_id=? AND receiver_id=? AND read_at IS NULL`).get(u.id, req.user.id);
    return { ...u, unread: unread?.c || 0 };
  });
  res.json(withUnread);
});

router.get('/history/:with_user_id', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = req.params.with_user_id;
  const msgs = db.prepare(`
    SELECT m.*, u.name as sender_name, u.jd_id as sender_jd_id, u.photo_url as sender_photo
    FROM chat_messages m JOIN users u ON u.id=m.sender_id
    WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
    ORDER BY m.created_at ASC LIMIT 100
  `).all(req.user.id, wid, wid, req.user.id);
  db.prepare(`UPDATE chat_messages SET read_at=datetime('now')
    WHERE receiver_id=? AND sender_id=? AND read_at IS NULL`).run(req.user.id, wid);
  res.json(msgs);
});

router.get('/unread', authMiddleware, (req, res) => {
  const db = getDb();
  const r = db.prepare(`SELECT COUNT(*) as c FROM chat_messages WHERE receiver_id=? AND read_at IS NULL`).get(req.user.id);
  res.json({ total: r?.c || 0 });
});


const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/chat')),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (!ext) {
      if (file.mimetype.includes('mp4') || file.mimetype.includes('aac')) ext = '.mp4';
      else if (file.mimetype.includes('ogg')) ext = '.ogg';
      else if (file.mimetype.includes('audio')) ext = '.webm';
      else ext = '.jpg';
    }
    cb(null, `chat_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo nao enviado' });
  const media_type = req.file.mimetype.startsWith('audio') ? 'audio' : 'image';
  const media_url = `/uploads/chat/${req.file.filename}`;
  res.json({ media_url, media_type });
});
module.exports = router;