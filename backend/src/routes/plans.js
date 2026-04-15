const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM plans WHERE active=1 ORDER BY price').all());
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { name, speed, price, benefits } = req.body;
  if (!name || !speed || !price) return res.status(400).json({ error: 'Campos obrigatórios' });
  const info = db.prepare('INSERT INTO plans (name,speed,price,benefits) VALUES (?,?,?,?)').run(name, speed, price, benefits || '');
  res.json({ id: info.lastInsertRowid, message: 'Plano criado' });
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM plans WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Não encontrado' });
  const { name, speed, price, benefits, active } = req.body;
  db.prepare('UPDATE plans SET name=?, speed=?, price=?, benefits=?, active=? WHERE id=?')
    .run(name||p.name, speed||p.speed, price||p.price, benefits||p.benefits, active !== undefined ? active : p.active, req.params.id);
  res.json({ message: 'Atualizado' });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE plans SET active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Plano desativado' });
});

module.exports = router;
