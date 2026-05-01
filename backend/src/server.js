const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Banco de dados SQLite
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../database.sqlite'));

// Criar tabelas se nao existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jd_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'tecnico',
    active INTEGER DEFAULT 1,
    photo_url TEXT,
    permissions TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  
  CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cpf TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    plan_id INTEGER,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    speed TEXT,
    active INTEGER DEFAULT 1
  );
  
  CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    technician_id INTEGER,
    status TEXT DEFAULT 'pendente',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Criar usuario admin se nao existir
const bcrypt = require('bcryptjs');
const adminExists = db.prepare('SELECT id FROM users WHERE jd_id = ?').get('ID000001');
if (!adminExists) {
  const result = db.prepare('INSERT INTO users (jd_id, name, email, role, active) VALUES (?, ?, ?, ?, ?)')
    .run('ID000001', 'Administrador', 'admin@sysflowcloudi.com', 'admin', 1);
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').run(result.lastInsertRowid, hash);
  console.log('Usuario admin criado: ID000001 / admin123');
}

// JWT simples
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'sysflow-secret-key';

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token nao fornecido' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalido' });
  }
};

// Rotas
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { jd_id, password } = req.body;
  
  const user = db.prepare('SELECT u.*, p.hash FROM users u JOIN passwords p ON u.id = p.user_id WHERE u.jd_id = ?').get(jd_id);
  
  if (!user || !bcrypt.compareSync(password, user.hash)) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }
  
  const token = jwt.sign({ userId: user.id, jd_id: user.jd_id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      jd_id: user.jd_id,
      name: user.name,
      role: user.role,
      email: user.email,
      photo_url: user.photo_url
    }
  });
});

app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, jd_id, name, email, role, photo_url, permissions FROM users WHERE id = ?').get(req.user.userId);
  res.json(user);
});

app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, jd_id, name, email, role, active, photo_url FROM users').all();
  res.json(users);
});

app.get('/api/clients', authMiddleware, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients').all();
  res.json(clients);
});

app.get('/api/plans', authMiddleware, (req, res) => {
  const plans = db.prepare('SELECT * FROM plans').all();
  res.json(plans);
});

app.get('/api/service-orders', authMiddleware, (req, res) => {
  const orders = db.prepare('SELECT * FROM service_orders').all();
  res.json(orders);
});

// Socket.io
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket conectado:', socket.id);
  
  socket.on('join', (userId) => {
    onlineUsers.set(userId, { socketId: socket.id, lastSeen: Date.now() });
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
  
  socket.on('disconnect', () => {
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});