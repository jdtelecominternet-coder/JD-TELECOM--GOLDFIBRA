const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly, sellerOrAdmin } = require('../middleware/auth');

function emit(req, entity) { try { req.app.get('io')?.emit('data:refresh', { entity }); } catch {} }

function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rev = 11 - (sum % 11); if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rev = 11 - (sum % 11); if (rev >= 10) rev = 0;
  return rev === parseInt(cpf[10]);
}

const baseQuery = `SELECT c.*, u.name as seller_name, p.name as plan_name, p.speed as plan_speed, p.price as plan_price
  FROM clients c LEFT JOIN users u ON u.id=c.seller_id LEFT JOIN plans p ON p.id=c.plan_id`;

router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  let rows;
  if (req.user.role === 'admin') {
    rows = db.prepare(baseQuery + ' ORDER BY c.created_at DESC').all();
  } else if (req.user.role === 'vendedor') {
    rows = db.prepare(baseQuery + ' WHERE c.seller_id=? ORDER BY c.created_at DESC').all(req.user.id);
  } else {
    rows = db.prepare(baseQuery + ` INNER JOIN service_orders so ON so.client_id=c.id AND so.technician_id=? ORDER BY c.created_at DESC`).all(req.user.id);
  }
  res.json(rows);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const row = db.prepare(baseQuery + ' WHERE c.id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Cliente nao encontrado' });
  res.json(row);
});

router.post('/', authMiddleware, sellerOrAdmin, (req, res) => {
  const { name, cpf, birth_date, whatsapp, email, cep, street, number, complement, neighborhood, city, state, due_day, plan_id, seller_id, observations } = req.body;
  if (!name || !cpf) return res.status(400).json({ error: 'Nome e CPF obrigatorios' });
  if (!validateCPF(cpf)) return res.status(400).json({ error: 'CPF invalido' });

  const db = getDb();
  const cleanCpf = cpf.replace(/\D/g, '');
  const existing = db.prepare('SELECT id FROM clients WHERE cpf=?').get(cleanCpf);
  if (existing) return res.status(400).json({ error: 'CPF ja cadastrado' });

  const sid = req.user.role === 'vendedor' ? req.user.id : (seller_id || null);

  const info = db.prepare(`INSERT INTO clients (name,cpf,birth_date,whatsapp,email,cep,street,number,complement,neighborhood,city,state,due_day,plan_id,seller_id,observations) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(name, cleanCpf, birth_date||null, whatsapp||null, email||null, cep||null, street||null, number||null, complement||null, neighborhood||null, city||null, state||null, due_day||null, plan_id||null, sid, observations||null);

  emit(req, 'clients');
  res.json({ id: info.lastInsertRowid, message: 'Cliente cadastrado' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });
  if (req.user.role === 'vendedor' && client.seller_id !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });
  if (req.user.role === 'tecnico') return res.status(403).json({ error: 'Acesso negado' });

  const { name, birth_date, whatsapp, email, cep, street, number, complement, neighborhood, city, state, due_day, status, plan_id, observations } = req.body;
  const newStatus = req.user.role === 'admin' && status ? status : client.status;

  db.prepare(`UPDATE clients SET name=?, birth_date=?, whatsapp=?, email=?, cep=?, street=?, number=?, complement=?, neighborhood=?, city=?, state=?, due_day=?, status=?, plan_id=?, observations=? WHERE id=?`).run(name||client.name, birth_date||client.birth_date, whatsapp||client.whatsapp, email!==undefined?email:client.email, cep||client.cep, street||client.street, number||client.number, complement||client.complement, neighborhood||client.neighborhood, city||client.city, state||client.state, due_day||client.due_day, newStatus, plan_id||client.plan_id, observations!==undefined?observations:client.observations, req.params.id);

  emit(req, 'clients');
  res.json({ message: 'Cliente atualizado' });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
  res.json({ message: 'Cliente removido' });
});

// Admin marca comissão do vendedor como paga
router.patch('/:id/pay-commission', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE clients SET commission_paid='pago' WHERE id=?`).run(req.params.id);
  emit(req, 'clients');
  res.json({ message: 'Comissão paga' });
});

// Rota publica de relatorio do cliente (sem auth)
router.get('/:id/report', (req, res) => {
  const db = getDb();
  const c = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(c);
});

module.exports = router;