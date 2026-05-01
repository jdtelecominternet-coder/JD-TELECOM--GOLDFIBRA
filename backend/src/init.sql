-- Script SQL para criar o banco de dados inicial
-- Execute: sqlite3 database.sqlite < init.sql

-- Tabela users
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

-- Tabela passwords
CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela clients
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

-- Tabela plans
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    speed TEXT,
    active INTEGER DEFAULT 1
);

-- Tabela service_orders
CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    technician_id INTEGER,
    status TEXT DEFAULT 'pendente',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Inserir usuario admin (senha: admin123 - hash bcrypt)
INSERT OR IGNORE INTO users (jd_id, name, email, role, active) 
VALUES ('ID000001', 'Administrador', 'admin@sysflowcloudi.com', 'admin', 1);

-- Inserir senha do admin
INSERT INTO passwords (user_id, hash) 
SELECT id, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
FROM users WHERE jd_id = 'ID000001';