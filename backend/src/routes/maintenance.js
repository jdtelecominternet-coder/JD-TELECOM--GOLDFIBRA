const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

function genId(id) { return `RD-${String(id).padStart(4, '0')}`; }

const PROBLEM_LABELS = {
  sem_sinal: 'CTO sem sinal', sinal_alterado: 'Sinal alterado',
  cto_quebrada: 'CTO quebrada', cto_caida: 'CTO caída',
  cabo_rompido: 'Cabo rompido', outro: 'Outro',
};

// Técnico cria OS de Rede
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { origin_os_id, problem_type, cto_number, description, photos_before,
            latitude_origin, longitude_origin } = req.body;

    if (!problem_type || !cto_number || !description)
      return res.status(400).json({ error: 'Tipo de problema, número da CTO e descrição são obrigatórios' });

    // Auto-atribuir técnico de rede disponível
    let techOnline = null;
    try { techOnline = db.prepare(`SELECT id FROM users WHERE role='manutencao' LIMIT 1`).get(); } catch(e) {}

    const r = db.prepare(`INSERT INTO maintenance_orders
      (origin_os_id, origin_tech_id, assigned_tech_id, problem_type, cto_number,
       description, photos_before, latitude_origin, longitude_origin, status)
      VALUES (?,?,?,?,?,?,?,?,?,'aguardando')`).run(
      origin_os_id || null, req.user.id,
      techOnline?.id || null,
      problem_type, cto_number.toUpperCase(),
      description.trim(), photos_before || '[]',
      latitude_origin || null, longitude_origin || null
    );

    const newId = r.lastInsertRowid;
    const readableId = genId(newId);
    try { db.prepare('UPDATE maintenance_orders SET readable_id=? WHERE id=?').run(readableId, newId); } catch(e) {}

    const problemLabel = PROBLEM_LABELS[problem_type] || problem_type;

    // ── DESATRIBUIR a OS original do técnico ────────────────────────────────
    if (origin_os_id) {
      const osMsg = `Problema na CTO ${cto_number.toUpperCase()} — aguardando manutenção de rede (${readableId})`;
      try {
        db.prepare(`UPDATE service_orders
          SET technician_id=NULL, status='pendente', admin_message=?
          WHERE id=?`).run(osMsg, origin_os_id);
      } catch(e) {}
    }

    const io = req.app.get('io');

    try {
      if (io) {
        const payload = { id: newId, readable_id: readableId, cto_number: cto_number.toUpperCase(),
          problem_type, problem_label: problemLabel, tech_name: req.user.name };
        // Notificar técnico de rede e admin
        io.emit('rede:nova_os', payload);
        if (techOnline?.id) io.to('user:' + techOnline.id).emit('rede:nova_os', payload);
      }
    } catch(e) {}

    // ── Notificar o PRÓPRIO técnico que enviou: OS removida do painel ───────
    try {
      if (io) {
        io.to('user:' + req.user.id).emit('os:rede_enviada', {
          os_id: origin_os_id,
          maintenance_readable_id: readableId,
          cto_number: cto_number.toUpperCase(),
          problem_label: problemLabel,
          message: `⚠️ Ordem encaminhada para manutenção de rede (${readableId}). Aguardando regularização da CTO ${cto_number.toUpperCase()}.`,
        });
        // Atualizar painel do técnico
        io.to('user:' + req.user.id).emit('os:removida', { os_id: origin_os_id });
        io.to('user:' + req.user.id).emit('data:refresh', { entity: 'orders' });
        // Notificar admins para atualizar lista de OS
        const admins = db.prepare("SELECT id FROM users WHERE role='admin' AND active=1").all();
        admins.forEach(a => {
          io.to('user:' + a.id).emit('data:refresh', { entity: 'orders' });
        });
      }
    } catch(e) {}

    res.json({ message: 'OS de Rede criada com sucesso', id: newId, readable_id: readableId });
  } catch(e) {
    console.error('maintenance POST error:', e.message);
    res.status(500).json({ error: 'Erro interno ao criar ordem: ' + e.message });
  }
});

// Lista ordens (admin vê todas, manutencao vê as suas + pendentes)
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    const role = req.user.role;

    let rows;
    if (role === 'manutencao') {
      let q = `SELECT mo.*, u1.name as origin_tech_name, u2.name as assigned_tech_name,
        so.readable_id as os_readable_id
        FROM maintenance_orders mo
        LEFT JOIN users u1 ON u1.id = mo.origin_tech_id
        LEFT JOIN users u2 ON u2.id = mo.assigned_tech_id
        LEFT JOIN service_orders so ON so.id = mo.origin_os_id
        WHERE (mo.assigned_tech_id=? OR mo.assigned_tech_id IS NULL OR mo.status='aguardando')`;
      const p = [req.user.id];
      if (status) { q += ' AND mo.status=?'; p.push(status); }
      q += ' ORDER BY mo.created_at DESC';
      rows = db.prepare(q).all(...p);
    } else {
      let q = `SELECT mo.*, u1.name as origin_tech_name, u2.name as assigned_tech_name,
        so.readable_id as os_readable_id
        FROM maintenance_orders mo
        LEFT JOIN users u1 ON u1.id = mo.origin_tech_id
        LEFT JOIN users u2 ON u2.id = mo.assigned_tech_id
        LEFT JOIN service_orders so ON so.id = mo.origin_os_id
        WHERE 1=1`;
      const p = [];
      if (status) { q += ' AND mo.status=?'; p.push(status); }
      q += ' ORDER BY mo.created_at DESC';
      rows = p.length ? db.prepare(q).all(...p) : db.prepare(q).all();
    }
    res.json(rows);
  } catch(e) {
    console.error('maintenance GET error:', e.message);
    res.status(500).json({ error: 'Erro ao listar ordens: ' + e.message });
  }
});

// Aceitar ordem (técnico de rede)
router.put('/:id/accept', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE maintenance_orders
    SET assigned_tech_id=?, status='em_deslocamento', started_at=datetime('now')
    WHERE id=?`).run(req.user.id, req.params.id);
  res.json({ message: 'Ordem aceita' });
});

// Atualizar status
router.put('/:id/status', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, latitude, longitude, photos_after, tech_observations, signal_after } = req.body;
  const mo = db.prepare('SELECT * FROM maintenance_orders WHERE id=?').get(req.params.id);
  if (!mo) return res.status(404).json({ error: 'Não encontrado' });

  const valid = ['em_deslocamento', 'em_andamento', 'concluido'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  if (status === 'concluido') {
    const pa = (() => { try { return JSON.parse(photos_after || '[]'); } catch { return []; } })();
    if (pa.length === 0) return res.status(400).json({ error: 'Fotos do local corrigido são obrigatórias' });
    if (!tech_observations) return res.status(400).json({ error: 'Observação de conclusão é obrigatória' });
    if (!signal_after && signal_after !== 0) return res.status(400).json({ error: 'Leitura do sinal (PowerMeter) após correção é obrigatória' });
    if (!latitude || !longitude) return res.status(400).json({ error: 'Geolocalização obrigatória para finalizar o serviço' });
  }

  let upd = `UPDATE maintenance_orders SET status=?`;
  const params = [status];

  if (status === 'em_andamento') {
    upd += `, arrived_at=datetime('now'), latitude_arrival=?, longitude_arrival=?`;
    params.push(latitude || null, longitude || null);
  }
  if (status === 'concluido') {
    upd += `, finished_at=datetime('now'), latitude_finish=?, longitude_finish=?, photos_after=?, tech_observations=?`;
    params.push(latitude, longitude, photos_after, tech_observations);
  }
  upd += ' WHERE id=?';
  params.push(req.params.id);
  db.prepare(upd).run(...params);

  if (status === 'concluido') {
    const io = req.app.get('io');

    // Buscar nome do técnico de rede (A) que resolveu
    const techA = db.prepare('SELECT name FROM users WHERE id=?').get(mo.assigned_tech_id || req.user.id);
    const techAName = techA?.name || req.user.name;

    // Buscar OS original para obter readable_id
    let osReadableId = null;
    if (mo.origin_os_id) {
      const os = db.prepare('SELECT readable_id FROM service_orders WHERE id=?').get(mo.origin_os_id);
      osReadableId = os?.readable_id;
    }

    const problemLabel = PROBLEM_LABELS[mo.problem_type] || mo.problem_type;

    // Payload completo para técnico B e admin
    const payload = {
      maintenance_id: mo.id,
      readable_id: mo.readable_id,
      cto_number: mo.cto_number,
      problem_type: mo.problem_type,
      problem_label: problemLabel,
      resolved_by: techAName,
      signal_after: signal_after,
      origin_os_id: mo.origin_os_id,
      os_readable_id: osReadableId,
      message: `✅ Problema na CTO ${mo.cto_number} resolvido por ${techAName}. Sinal: ${signal_after} dBm. Sua OS pode ser reagendada pelo administrador.`,
    };

    // 1. Notificar técnico B (quem abriu a ocorrência)
    if (io && mo.origin_tech_id) {
      io.to('user:' + mo.origin_tech_id).emit('rede:concluida', payload);
    }

    // 2. Notificar todos os admins
    if (io) {
      const admins = db.prepare("SELECT id FROM users WHERE role='admin' AND active=1").all();
      admins.forEach(a => {
        io.to('user:' + a.id).emit('rede:concluida_admin', payload);
      });
    }

    // 3. Reabrir OS original: remove do técnico B, coloca como pendente para admin reatribuir
    if (mo.origin_os_id) {
      db.prepare("UPDATE service_orders SET status='pendente', technician_id=NULL WHERE id=?").run(mo.origin_os_id);
      // Notificar via data:refresh para técnico B atualizar a tela
      if (io && mo.origin_tech_id) {
        io.to('user:' + mo.origin_tech_id).emit('os:removida', { os_id: mo.origin_os_id });
        io.to('user:' + mo.origin_tech_id).emit('data:refresh', { entity: 'orders' });
      }
      // Notificar admins para atualizar lista de OS
      if (io) {
        io.emit('data:refresh', { entity: 'orders' });
      }
    }

    // 4. Atualizar ocorrência CTO vinculada para "resolvido" (fica verde)
    try {
      db.prepare(`
        UPDATE cto_occurrences
        SET status='resolvido', resolved_at=datetime('now'), resolved_by_id=?
        WHERE maintenance_order_id=? OR (cto_number=? AND status!='resolvido')
      `).run(req.user.id, mo.id, mo.cto_number);
    } catch {}

    // Notificar atualização das ocorrências CTO
    if (io) {
      io.emit('data:refresh', { entity: 'cto_occurrences' });
    }
  }

  res.json({ message: 'Status atualizado' });
});

// Admin atribui técnico
router.put('/:id/assign', authMiddleware, adminOnly, (req, res) => {
  const db = getDb();
  const { tech_id } = req.body;
  db.prepare("UPDATE maintenance_orders SET assigned_tech_id=?, status='aguardando' WHERE id=?").run(tech_id, req.params.id);
  const io = req.app.get('io');
  if (io) io.to('user:' + tech_id).emit('rede:nova_os', { maintenance_id: req.params.id });
  res.json({ message: 'Técnico atribuído' });
});

module.exports = router;
