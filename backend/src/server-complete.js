const express = require('express');
const cors = require('cors');
const { initDatabase, getDb } = require('./database');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Inicializar banco de dados
let db;
initDatabase().then(database => {
  db = database;
  console.log('Banco de dados iniciado.');
}).catch(err => {
  console.error('Erro ao iniciar banco:', err);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { jd_id, password } = req.body;
  console.log('Login:', { jd_id, password });
  
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  
  const user = db.prepare('SELECT * FROM users WHERE jd_id = ?').get(jd_id);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  
  const passRecord = db.prepare('SELECT * FROM passwords WHERE user_id = ?').get(user.id);
  if (!passRecord) return res.status(401).json({ error: 'Senha não configurada' });
  
  const valid = bcrypt.compareSync(password, passRecord.hash);
  if (!valid) return res.status(401).json({ error: 'Senha incorreta' });
  
  res.json({
    success: true,
    token: 'token-' + Date.now(),
    user: {
      id: user.id,
      jd_id: user.jd_id,
      name: user.name,
      role: user.role,
      permissions: user.permissions ? JSON.parse(user.permissions) : {}
    }
  });
});

// Users
app.get('/api/users/me', (req, res) => {
  res.json({
    id: 1,
    jd_id: '000001',
    name: 'Administrador',
    role: 'admin',
    permissions: {}
  });
});

app.get('/api/users', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const users = db.prepare('SELECT id, jd_id, name, role, email, phone, active, created_at FROM users').all();
  res.json(users);
});

// Clients
app.get('/api/clients', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const clients = db.prepare(`SELECT c.*, p.name as plan_name, p.speed as plan_speed 
    FROM clients c LEFT JOIN plans p ON p.id=c.plan_id ORDER BY c.created_at DESC`).all();
  res.json(clients);
});

app.get('/api/clients/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const client = db.prepare(`SELECT c.*, p.name as plan_name, p.speed as plan_speed 
    FROM clients c LEFT JOIN plans p ON p.id=c.plan_id WHERE c.id=?`).get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(client);
});

// Plans
app.get('/api/plans', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const plans = db.prepare('SELECT * FROM plans WHERE active=1 ORDER BY price').all();
  res.json(plans);
});

// Settings
app.get('/api/settings', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const settings = db.prepare('SELECT * FROM settings WHERE id=1').get();
  res.json(settings || {});
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  
  const clients = db.prepare('SELECT COUNT(*) as c FROM clients').get();
  const plans = db.prepare('SELECT COUNT(*) as c FROM plans WHERE active=1').get();
  const users = db.prepare('SELECT COUNT(*) as c FROM users WHERE active=1').get();
  const orders = db.prepare('SELECT COUNT(*) as c FROM service_orders').get();
  
  res.json({
    totalClients: clients?.c || 0,
    totalPlans: plans?.c || 0,
    totalUsers: users?.c || 0,
    totalOrders: orders?.c || 0
  });
});

// Service Orders
app.get('/api/orders', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const orders = db.prepare(`SELECT so.*, c.name as client_name, p.name as plan_name, u.name as technician_name
    FROM service_orders so 
    LEFT JOIN clients c ON c.id=so.client_id 
    LEFT JOIN plans p ON p.id=so.plan_id
    LEFT JOIN users u ON u.id=so.technician_id
    ORDER BY so.created_at DESC`).all();
  res.json(orders);
});

// Rotas adicionais para o frontend
app.get('/api/users/heartbeat', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/settings/dashboard', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const settings = db.prepare('SELECT * FROM settings WHERE id=1').get();
  res.json(settings || { company_name: 'SysFlowCloudi' });
});

app.get('/api/settings/role-permissions', (req, res) => {
  res.json({
    admin: ['*'],
    vendedor: ['clients', 'sales'],
    tecnico: ['orders', 'stock'],
    tecnico_rede: ['network', 'maintenance']
  });
});

app.get('/api/solicitations', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const solicitations = db.prepare(`SELECT s.*, p.name as plan_name 
    FROM solicitations s LEFT JOIN plans p ON p.id=s.plan_id 
    ORDER BY s.created_at DESC`).all();
  res.json(solicitations);
});

// Socket.io placeholder
app.get('/socket.io/', (req, res) => {
  res.json({ message: 'Socket.io not implemented in simple server' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
