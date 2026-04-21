const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Gerar senha aleatória segura
function gerarSenha(len = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Simular etapas do provisionamento com log detalhado
async function executarProvisionamento(provider, dados) {
  const logs = [];
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  logs.push({ step: 1, status: 'ok', msg: `Conectando ao servidor ${provider.ip_servidor || 'local'}...` });
  await delay(300);

  logs.push({ step: 2, status: 'ok', msg: `Autenticando com usuário ${provider.usuario || 'admin'}...` });
  await delay(300);

  logs.push({ step: 3, status: 'ok', msg: `Criando perfil PPPoE: ${dados.login_pppoe} / plano: ${dados.plano || 'padrão'}` });
  await delay(300);

  if (provider.tipo_olt && provider.tipo_olt !== 'nenhuma' && dados.serial_onu) {
    logs.push({ step: 4, status: 'ok', msg: `Liberando ONU (${provider.tipo_olt.toUpperCase()}): serial ${dados.serial_onu}` });
    await delay(300);
  }

  if (provider.vlan) {
    logs.push({ step: 5, status: 'ok', msg: `Configurando VLAN ${provider.vlan}` });
    await delay(200);
  }

  if (provider.pool_ip) {
    logs.push({ step: 6, status: 'ok', msg: `Atribuindo IP do pool: ${provider.pool_ip}` });
    await delay(200);
  }

  logs.push({ step: 7, status: 'ok', msg: '✅ Cliente ativado com sucesso! Internet disponível.' });

  return logs;
}

// POST /api/provisioning/activate — ativar cliente
router.post('/activate', authMiddleware, async (req, res) => {
  const db = getDb();
  const {
    client_id, provider_id,
    login_pppoe, senha_pppoe,
    plano, mac_onu, serial_onu,
  } = req.body;

  if (!provider_id || !login_pppoe) {
    return res.status(400).json({ error: 'Provedor e login PPPoE são obrigatórios.' });
  }

  const provider = db.prepare('SELECT * FROM providers WHERE id=? AND ativo=1').get(provider_id);
  if (!provider) return res.status(404).json({ error: 'Provedor não encontrado ou inativo.' });

  // Verificar se login já existe
  const existing = db.prepare("SELECT id FROM client_provisioning WHERE login_pppoe=? AND status='ativo'").get(login_pppoe);
  if (existing) return res.status(400).json({ error: `Login PPPoE '${login_pppoe}' já está em uso.` });

  const senhaFinal = senha_pppoe || gerarSenha();

  try {
    const logs = await executarProvisionamento(provider, { login_pppoe, plano, serial_onu, mac_onu });
    const logStr = JSON.stringify(logs);

    const result = db.prepare(`
      INSERT INTO client_provisioning
        (client_id, provider_id, login_pppoe, senha_pppoe, plano, mac_onu, serial_onu, status, log, created_by)
      VALUES (?,?,?,?,?,?,?,'ativo',?,?)
    `).run(
      client_id || null, provider_id,
      login_pppoe, senhaFinal,
      plano || null, mac_onu || null, serial_onu || null,
      logStr, req.user.id
    );

    res.json({
      success: true,
      id: result.lastInsertRowid,
      login_pppoe,
      senha_pppoe: senhaFinal,
      logs,
    });
  } catch (e) {
    // Salvar com status de erro
    db.prepare(`
      INSERT INTO client_provisioning
        (client_id, provider_id, login_pppoe, senha_pppoe, plano, mac_onu, serial_onu, status, log, created_by)
      VALUES (?,?,?,?,?,?,?,'erro',?,?)
    `).run(client_id || null, provider_id, login_pppoe, senhaFinal, plano || null, mac_onu || null, serial_onu || null, e.message, req.user.id);

    res.status(500).json({ error: 'Erro no provisionamento: ' + e.message });
  }
});

// POST /api/provisioning/deactivate — desativar cliente
router.post('/deactivate', authMiddleware, (req, res) => {
  const db = getDb();
  const { provisioning_id } = req.body;
  if (!provisioning_id) return res.status(400).json({ error: 'ID do provisionamento é obrigatório.' });

  const prov = db.prepare('SELECT * FROM client_provisioning WHERE id=?').get(provisioning_id);
  if (!prov) return res.status(404).json({ error: 'Provisionamento não encontrado.' });

  db.prepare("UPDATE client_provisioning SET status='desativado' WHERE id=?").run(provisioning_id);
  res.json({ success: true, message: `Cliente ${prov.login_pppoe} desativado.` });
});

// GET /api/provisioning/status/:client_id — status do provisionamento
router.get('/status/:client_id', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT cp.*, p.nome as provider_nome, p.tipo_olt
    FROM client_provisioning cp
    LEFT JOIN providers p ON p.id = cp.provider_id
    WHERE cp.client_id=?
    ORDER BY cp.created_at DESC
  `).all(req.params.client_id);
  res.json(rows);
});

// GET /api/provisioning — listar todos (admin) ou do próprio técnico
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const isAdmin = req.user.role === 'admin';
  let rows;
  if (isAdmin) {
    rows = db.prepare(`
      SELECT cp.*, p.nome as provider_nome,
             c.name as client_name, u.name as created_by_name
      FROM client_provisioning cp
      LEFT JOIN providers p ON p.id = cp.provider_id
      LEFT JOIN clients c ON c.id = cp.client_id
      LEFT JOIN users u ON u.id = cp.created_by
      ORDER BY cp.created_at DESC LIMIT 200
    `).all();
  } else {
    rows = db.prepare(`
      SELECT cp.*, p.nome as provider_nome,
             c.name as client_name
      FROM client_provisioning cp
      LEFT JOIN providers p ON p.id = cp.provider_id
      LEFT JOIN clients c ON c.id = cp.client_id
      WHERE cp.created_by=?
      ORDER BY cp.created_at DESC LIMIT 100
    `).all(req.user.id);
  }
  res.json(rows);
});

module.exports = router;
