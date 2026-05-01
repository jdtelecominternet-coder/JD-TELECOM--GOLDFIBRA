const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Criando tabelas...');

// Tabela users
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
  )
`);

// Tabela passwords
db.exec(`
  CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Tabela clients
db.exec(`
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
  )
`);

// Tabela plans
db.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    speed TEXT,
    active INTEGER DEFAULT 1
  )
`);

// Tabela service_orders
db.exec(`
  CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    technician_id INTEGER,
    status TEXT DEFAULT 'pendente',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Criar usuario admin
console.log('Criando usuario admin...');
const adminHash = bcrypt.hashSync('admin123', 10);

const insertUser = db.prepare('INSERT OR IGNORE INTO users (jd_id, name, email, role, active) VALUES (?, ?, ?, ?, ?)');
const result = insertUser.run('ID000001', 'Administrador', 'admin@sysflowcloudi.com', 'admin', 1);

if (result.changes > 0) {
  const userId = result.lastInsertRowid;
  const insertPass = db.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)');
  insertPass.run(userId, adminHash);
  console.log('Usuario admin criado: ID000001 / admin123');
} else {
  // Atualizar senha do admin existente
  const user = db.prepare('SELECT id FROM users WHERE jd_id = ?').get('ID000001');
  if (user) {
    db.prepare('UPDATE passwords SET hash = ? WHERE user_id = ?').run(adminHash, user.id);
    console.log('Senha do admin atualizada: ID000001 / admin123');
  }
}

console.log('Banco de dados criado com sucesso!');
console.log('Login: ID000001');
console.log('Senha: admin123');

db.close();