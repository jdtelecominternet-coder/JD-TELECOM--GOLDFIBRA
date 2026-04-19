const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/tipos-os — lista todos os tipos ativos
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const tipos = db.prepare('SELECT * FROM tipos_ordem_servico WHERE ativo=1 ORDER BY id').all();
  res.json(tipos);
});

// PUT /api/tipos-os/:id — admin atualiza valor_padrao
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { valor_padrao } = req.body;

  if (typeof valor_padrao !== 'number' || !isFinite(valor_padrao) || valor_padrao < 0)
    return res.status(400).json({ error: 'valor_padrao deve ser um número maior ou igual a zero.' });

  const tipo = db.prepare('SELECT id FROM tipos_ordem_servico WHERE id=?').get(req.params.id);
  if (!tipo) return res.status(404).json({ error: 'Tipo não encontrado.' });

  db.prepare('UPDATE tipos_ordem_servico SET valor_padrao=? WHERE id=?').run(valor_padrao, req.params.id);
  res.json({ message: 'Valor atualizado com sucesso!' });
});

module.exports = router;
