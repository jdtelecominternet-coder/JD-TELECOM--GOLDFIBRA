const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Chave de criptografia (usa JWT_SECRET como base)
const ENC_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'jdtelecom2024').digest();
const IV_LEN = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(text) {
  if (!text || !text.includes(':')) return '';
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch { return ''; }
}

// Middleware: somente usuário ID=1 (Admin Master)
function masterOnly(req, res, next) {
  if (req.user.id !== 1) return res.status(403).json({ error: 'Acesso restrito ao Administrador Master.' });
  next();
}

// Remove campos sensíveis para listagem pública
function sanitize(p) {
  const { senha, senha_olt, token, ...rest } = p;
  return rest;
}

// GET /api/providers — lista provedores ativos (sem senhas) — admin + técnico
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM providers WHERE ativo=1 ORDER BY nome').all();
  res.json(rows.map(sanitize));
});

// GET /api/providers/:id — detalhes completos (somente master)
router.get('/:id', authMiddleware, masterOnly, (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM providers WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Provedor não encontrado' });
  // Descriptografar senhas para exibição no formulário de edição
  res.json({
    ...p,
    senha: p.senha ? decrypt(p.senha) : '',
    senha_olt: p.senha_olt ? decrypt(p.senha_olt) : '',
  });
});

// POST /api/providers — cadastrar provedor (somente master)
router.post('/', authMiddleware, masterOnly, (req, res) => {
  const db = getDb();
  const {
    nome, tipo_auth, ip_servidor, porta, tipo_integracao,
    usuario, senha, token,
    vlan, perfil_velocidade, pool_ip,
    tipo_olt, ip_olt, porta_olt, usuario_olt, senha_olt,
  } = req.body;

  if (!nome) return res.status(400).json({ error: 'Nome do provedor é obrigatório.' });

  const result = db.prepare(`
    INSERT INTO providers
      (nome, tipo_auth, ip_servidor, porta, tipo_integracao,
       usuario, senha, token, vlan, perfil_velocidade, pool_ip,
       tipo_olt, ip_olt, porta_olt, usuario_olt, senha_olt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    nome, tipo_auth || 'pppoe',
    ip_servidor || null, porta || 8728, tipo_integracao || 'api',
    usuario || null, senha ? encrypt(senha) : null, token || null,
    vlan || null, perfil_velocidade || null, pool_ip || null,
    tipo_olt || 'nenhuma', ip_olt || null, porta_olt || 23,
    usuario_olt || null, senha_olt ? encrypt(senha_olt) : null,
  );

  res.json({ message: 'Provedor cadastrado com sucesso', id: result.lastInsertRowid });
});

// PUT /api/providers/:id — editar (somente master)
router.put('/:id', authMiddleware, masterOnly, (req, res) => {
  const db = getDb();
  const {
    nome, tipo_auth, ip_servidor, porta, tipo_integracao,
    usuario, senha, token,
    vlan, perfil_velocidade, pool_ip,
    tipo_olt, ip_olt, porta_olt, usuario_olt, senha_olt,
  } = req.body;

  const existing = db.prepare('SELECT * FROM providers WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Provedor não encontrado' });

  // Manter senha atual se não enviada
  const newSenha = senha ? encrypt(senha) : existing.senha;
  const newSenhaOlt = senha_olt ? encrypt(senha_olt) : existing.senha_olt;

  db.prepare(`
    UPDATE providers SET
      nome=?, tipo_auth=?, ip_servidor=?, porta=?, tipo_integracao=?,
      usuario=?, senha=?, token=?, vlan=?, perfil_velocidade=?, pool_ip=?,
      tipo_olt=?, ip_olt=?, porta_olt=?, usuario_olt=?, senha_olt=?
    WHERE id=?
  `).run(
    nome || existing.nome, tipo_auth || existing.tipo_auth,
    ip_servidor ?? existing.ip_servidor, porta || existing.porta,
    tipo_integracao || existing.tipo_integracao,
    usuario ?? existing.usuario, newSenha, token ?? existing.token,
    vlan ?? existing.vlan, perfil_velocidade ?? existing.perfil_velocidade,
    pool_ip ?? existing.pool_ip,
    tipo_olt || existing.tipo_olt, ip_olt ?? existing.ip_olt,
    porta_olt || existing.porta_olt, usuario_olt ?? existing.usuario_olt,
    newSenhaOlt, req.params.id,
  );

  res.json({ message: 'Provedor atualizado com sucesso' });
});

// DELETE /api/providers/:id — desativar (somente master)
router.delete('/:id', authMiddleware, masterOnly, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE providers SET ativo=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Provedor desativado' });
});

// POST /api/providers/:id/test — testar conexão (somente master)
router.post('/:id/test', authMiddleware, masterOnly, async (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM providers WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Provedor não encontrado' });

  const { tipo } = req.body; // 'mikrotik' | 'olt'
  const results = [];

  try {
    if (tipo === 'mikrotik' && p.ip_servidor) {
      // Teste de ping/TCP na porta da API MikroTik
      const net = require('net');
      await new Promise((resolve, reject) => {
        const sock = new net.Socket();
        sock.setTimeout(5000);
        sock.on('connect', () => { sock.destroy(); resolve(); });
        sock.on('timeout', () => { sock.destroy(); reject(new Error('Timeout')); });
        sock.on('error', reject);
        sock.connect(p.porta || 8728, p.ip_servidor);
      });
      results.push({ ok: true, msg: `MikroTik: Porta ${p.porta || 8728} acessível em ${p.ip_servidor}` });
    } else if (tipo === 'olt' && p.ip_olt) {
      const net = require('net');
      await new Promise((resolve, reject) => {
        const sock = new net.Socket();
        sock.setTimeout(5000);
        sock.on('connect', () => { sock.destroy(); resolve(); });
        sock.on('timeout', () => { sock.destroy(); reject(new Error('Timeout')); });
        sock.on('error', reject);
        sock.connect(p.porta_olt || 23, p.ip_olt);
      });
      results.push({ ok: true, msg: `OLT: Porta ${p.porta_olt || 23} acessível em ${p.ip_olt}` });
    } else {
      results.push({ ok: false, msg: 'IP do servidor não configurado' });
    }
  } catch (e) {
    results.push({ ok: false, msg: `Falha na conexão: ${e.message}` });
  }

  res.json({ results });
});

module.exports = router;
