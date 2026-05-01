const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { initDatabase, getDb } = require('./database');
const { JWT_SECRET } = require('./middleware/auth');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3001;

// Ensure upload directories exist
const fs = require('fs');
['uploads/logos', 'uploads/photos', 'uploads/profiles', 'uploads/chat'].forEach(dir => {
  const full = path.join(__dirname, '..', dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Track online users: userId -> { socketId, jd_id, name, role }
const onlineUsers = new Map();

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token obrigatório'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;

  // Admin, tecnico e vendedor podem usar o chat

  // Mark user online
  onlineUsers.set(user.id, { socketId: socket.id, jd_id: user.jd_id, name: user.name, role: user.role });
  io.emit('users:online', Array.from(onlineUsers.entries()).map(([id, u]) => ({ id, ...u })));

  // Join personal room
  socket.join(`user:${user.id}`);

  // Send chat history on connect
  socket.on('chat:history', ({ with_user_id }) => {
    const db = getDb();
    const msgs = db.prepare(`
      SELECT m.*, u.name as sender_name, u.jd_id as sender_jd_id
      FROM chat_messages m JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
      ORDER BY m.created_at ASC LIMIT 100
    `).all(user.id, with_user_id, with_user_id, user.id);
    socket.emit('chat:history', msgs);

    // Mark as read
    db.prepare('UPDATE chat_messages SET read_at=datetime("now") WHERE receiver_id=? AND sender_id=? AND read_at IS NULL')
      .run(user.id, with_user_id);
    // Notify sender that messages were read
    io.to('user:' + with_user_id).emit('chat:read', { by_user_id: user.id });
  });

  // Send message
  socket.on('chat:send', ({ receiver_id, message }) => {
    if (!message?.trim()) return;

    const db = getDb();
    const receiver = db.prepare('SELECT id, role FROM users WHERE id=? AND active=1').get(receiver_id);
    if (!receiver) return;

    const info = db.prepare(`INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?,?,?)`)
      .run(user.id, receiver_id, message.trim());

    const msg = {
      id: info.lastInsertRowid,
      sender_id: user.id,
      receiver_id,
      message: message.trim(),
      sender_name: user.name,
      sender_jd_id: user.jd_id,
      created_at: new Date().toISOString(),
      read_at: null
    };

    // Emit to receiver and sender
    io.to(`user:${receiver_id}`).emit('chat:message', msg);
    socket.emit('chat:message', msg);
  });

  // Typing indicator
  socket.on('chat:typing', ({ receiver_id, typing }) => {
    io.to(`user:${receiver_id}`).emit('chat:typing', { sender_id: user.id, typing });
  });

  socket.on('ping', () => { /* keepalive */ });

  socket.on('disconnect', () => {
    // Aguarda 5 segundos antes de marcar offline
    setTimeout(() => {
      const current = onlineUsers.get(user.id);
      if (current && current.socketId === socket.id) {
        onlineUsers.delete(user.id);
        io.emit('users:online', Array.from(onlineUsers.entries()).map(([id, u]) => ({ id, ...u })));
        // Notifica admins que técnico foi offline (remove localização)
        io.emit('tech:offline', { user_id: user.id });
      }
    }, 5000);
  });

  // Técnico transmite localização em tempo real
  socket.on('tech:location', ({ latitude, longitude, geo_address }) => {
    if (!['tecnico', 'manutencao'].includes(user.role)) return;
    // Atualiza o mapa em memória e broadcast para todos admins
    const entry = onlineUsers.get(user.id);
    if (entry) {
      onlineUsers.set(user.id, { ...entry, latitude, longitude, geo_address });
    }
    io.emit('tech:location_update', {
      user_id: user.id,
      jd_id: user.jd_id,
      name: user.name,
      latitude,
      longitude,
      geo_address,
      ts: Date.now(),
    });
  });
});

// Expose io for routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Middleware de proteção contra cópia
const { protectionMiddleware, rateLimitMiddleware, apiIntegrityMiddleware } = require('./middleware/protection');
app.use(protectionMiddleware);
app.use(rateLimitMiddleware);
app.use(apiIntegrityMiddleware);

async function start() {
  await initDatabase();
  console.log('Banco de dados iniciado.');

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/auth/webauthn', require('./routes/webauthn'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/solicitations', require('./routes/solicitations'));
  app.use('/api/plans', require('./routes/plans'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/settings', require('./routes/settings'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api/cto', require('./routes/cto'));
  app.use('/api/maintenance', require('./routes/maintenance'));
  app.use('/api/stock',       require('./routes/stock'));
  app.use('/api/deploy',      require('./routes/deploy'));
  app.use('/api/tipos-os',    require('./routes/tiposOs'));
  app.use('/api/providers', require('./routes/providers'));
  app.use('/api/provisioning', require('./routes/provisioning'));
  app.use('/api/quality-control', require('./routes/qualityControl'));
  app.use('/api/face-auth', require('./routes/faceAuth'));

  app.get('/api/health', (req, res) => res.json({ status: 'OK', system: 'SysFlowCloudi' }));

  httpServer.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  SysFlowCloudi - Backend`);
    console.log(`  Server: http://localhost:${PORT}`);
    console.log(`  Login: JD000001 / admin123`);
    console.log(`========================================\n`);
  });
}

start().catch(err => { console.error('Erro ao iniciar:', err); process.exit(1); });
