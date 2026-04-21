const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const MAX_PER_PERIOD = 2; // limite por período (manhã/tarde)

// Publico - retorna planos
router.get('/plans', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT id, name, speed, price FROM plans ORDER BY name').all());
});

// Publico - disponibilidade do calendário
// GET /solicitations/availability?month=YYYY-MM
router.get('/availability', (req, res) => {
  const db = getDb();
  const { month } = req.query; // ex: 2026-04
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Parâmetro month inválido. Use YYYY-MM' });

  // Buscar todos os agendamentos do mês (solicitations + service_orders)
  const solRows = db.prepare(`
    SELECT scheduled_date, install_period, COUNT(*) as count
    FROM solicitations
    WHERE scheduled_date LIKE ? AND install_period IN ('manha','tarde')
    GROUP BY scheduled_date, install_period
  `).all(month + '%');

  const osRows = db.prepare(`
    SELECT scheduled_date, install_period, COUNT(*) as count
    FROM service_orders
    WHERE scheduled_date LIKE ? AND install_period IN ('manha','tarde') AND status NOT IN ('cancelado')
    GROUP BY scheduled_date, install_period
  `).all(month + '%');

  // Consolidar
  const map = {};
  const addRow = (row) => {
    if (!row.scheduled_date) return;
    const key = row.scheduled_date.slice(0, 10);
    if (!map[key]) map[key] = { manha: 0, tarde: 0 };
    map[key][row.install_period] = (map[key][row.install_period] || 0) + row.count;
  };
  solRows.forEach(addRow);
  osRows.forEach(addRow);

  // Montar resposta com status de cada dia
  const result = {};
  for (const [date, counts] of Object.entries(map)) {
    result[date] = {
      manha: { count: counts.manha || 0, available: (counts.manha || 0) < MAX_PER_PERIOD },
      tarde: { count: counts.tarde || 0, available: (counts.tarde || 0) < MAX_PER_PERIOD },
    };
    result[date].full = !result[date].manha.available && !result[date].tarde.available;
    result[date].almostFull = (counts.manha || 0) + (counts.tarde || 0) >= MAX_PER_PERIOD;
  }
  res.json({ month, limit: MAX_PER_PERIOD, days: result });
});

// Publico - valida token
router.get('/validate-token/:token', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT st.*, u.name as seller_name, u.role as creator_role
    FROM solicitation_tokens st
    LEFT JOIN users u ON u.id = st.created_by
    WHERE st.token = ?
  `).get(req.params.token);
  if (!row) return res.status(404).json({ valid: false, reason: 'Token nao encontrado' });
  if (row.used) return res.status(400).json({ valid: false, reason: 'Token ja utilizado' });
  // Só expõe o nome se o criador for vendedor (link de indicação)
  const seller_name = row.creator_role === 'vendedor' ? row.seller_name : null;
  res.json({ valid: true, seller_name });
});

// Autenticado - gera token
router.post('/token', authMiddleware, (req, res) => {
  const db = getDb();
  const token = crypto.randomBytes(20).toString('hex');
  db.prepare('INSERT INTO solicitation_tokens (token, created_by) VALUES (?,?)').run(token, req.user.id);
  const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ token, link: `${baseUrl}/solicitar?token=${token}` });
});

// Publico - recebe solicitacao
router.post('/', (req, res) => {
  const db = getDb();
  const { name, cpf, birth_date, whatsapp, email, cep, street, number, complement,
          neighborhood, city, state, plan_id, install_period, scheduled_date, observations, token } = req.body;
  if (!name || !whatsapp) return res.status(400).json({ error: 'Nome e WhatsApp obrigatorios' });
  if (!token) return res.status(400).json({ error: 'Token obrigatorio' });
  const tkRow = db.prepare('SELECT * FROM solicitation_tokens WHERE token=?').get(token);
  if (!tkRow) return res.status(400).json({ error: 'Token invalido' });
  if (tkRow.used) return res.status(400).json({ error: 'Token ja utilizado' });

  // Validar limite de agendamento (se data e período forem informados)
  if (scheduled_date && install_period && ['manha','tarde'].includes(install_period)) {
    const dateFmt = scheduled_date.slice(0, 10);
    const solCount = db.prepare(`SELECT COUNT(*) as c FROM solicitations WHERE scheduled_date LIKE ? AND install_period=?`).get(dateFmt + '%', install_period)?.c || 0;
    const osCount  = db.prepare(`SELECT COUNT(*) as c FROM service_orders WHERE scheduled_date LIKE ? AND install_period=? AND status NOT IN ('cancelado')`).get(dateFmt + '%', install_period)?.c || 0;
    if (solCount + osCount >= MAX_PER_PERIOD) {
      const periodLabel = install_period === 'manha' ? 'manhã' : 'tarde';
      return res.status(409).json({ error: `Período da ${periodLabel} no dia ${dateFmt} já está cheio. Por favor, escolha outro horário ou data.` });
    }
  }

  const seller_id = tkRow.created_by || null;
  try {
    db.prepare('ALTER TABLE solicitations ADD COLUMN scheduled_date TEXT').run();
  } catch (_) {}
  db.prepare('INSERT INTO solicitations (name,cpf,birth_date,whatsapp,email,cep,street,number,complement,neighborhood,city,state,plan_id,install_period,scheduled_date,observations,token,seller_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(name, cpf||null, birth_date||null, whatsapp, email||null, cep||null, street||null, number||null, complement||null, neighborhood||null, city||null, state||null, plan_id||null, install_period||null, scheduled_date||null, observations||null, token, seller_id);
  db.prepare('UPDATE solicitation_tokens SET used=1, used_at=datetime("now") WHERE token=?').run(token);
  try { req.app.get('io')?.emit('data:refresh', { entity: 'solicitations' }); } catch {}
  res.json({ message: 'Solicitacao enviada com sucesso!' });
});

// Admin - lista solicitacoes
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();
  const rows = db.prepare(`SELECT s.*, p.name as plan_name, p.speed as plan_speed, u.name as seller_name, u.jd_id as seller_jd_id
    FROM solicitations s
    LEFT JOIN plans p ON p.id=s.plan_id
    LEFT JOIN users u ON u.id=s.seller_id
    ORDER BY s.created_at DESC`).all();
  res.json(rows);
});

// Admin - aprovar (cria cliente)
router.put('/:id/approve', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();
  const s = db.prepare('SELECT * FROM solicitations WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Nao encontrada' });
  db.prepare('INSERT INTO clients (name,cpf,birth_date,whatsapp,email,cep,street,number,complement,neighborhood,city,state,plan_id,observations,seller_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(s.name, s.cpf, s.birth_date, s.whatsapp, s.email||null, s.cep, s.street, s.number, s.complement, s.neighborhood, s.city, s.state, s.plan_id, s.observations, s.seller_id||null);
  db.prepare('UPDATE solicitations SET status=? WHERE id=?').run('aprovado', req.params.id);
  try { req.app.get('io')?.emit('data:refresh', { entity: 'solicitations' }); } catch {}
  res.json({ message: 'Cliente criado com sucesso!' });
});

// Admin - rejeitar
router.put('/:id/reject', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();
  db.prepare('UPDATE solicitations SET status=? WHERE id=?').run('rejeitado', req.params.id);
  try { req.app.get('io')?.emit('data:refresh', { entity: 'solicitations' }); } catch {}
  res.json({ message: 'Solicitacao rejeitada' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();
  db.prepare('DELETE FROM solicitations WHERE id=?').run(req.params.id);
  try { req.app.get('io')?.emit('data:refresh', { entity: 'solicitations' }); } catch {}
  res.json({ message: 'Solicitação deletada' });
});

module.exports = router;