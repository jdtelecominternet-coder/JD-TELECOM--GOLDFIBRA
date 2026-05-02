const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../database.sqlite3.bin');

let _sqlDb = null;
let _db = null;

function saveDb() {
  if (!_sqlDb) return;
  const data = _sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function makeDb(sqlDb) {
  _sqlDb = sqlDb;

  function isWrite(sql) {
    return /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql);
  }

  return {
    prepare(sql) {
      const write = isWrite(sql);
      return {
        run(...args) {
          const stmt = sqlDb.prepare(sql);
          stmt.run(args.flat());
          stmt.free();
          const rowid = sqlDb.exec('SELECT last_insert_rowid()');
          const lastInsertRowid = rowid.length ? rowid[0].values[0][0] : null;
          if (write) saveDb();
          return { lastInsertRowid };
        },
        get(...args) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(args.flat());
          let row = null;
          if (stmt.step()) row = stmt.getAsObject();
          stmt.free();
          return row;
        },
        all(...args) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(args.flat());
          const results = [];
          while (stmt.step()) results.push(stmt.getAsObject());
          stmt.free();
          return results;
        }
      };
    },
    exec(sql) {
      const result = sqlDb.exec(sql);
      if (isWrite(sql)) saveDb();
      return result;
    },
    _raw: sqlDb
  };
}

async function initDatabase() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(data);
  } else {
    sqlDb = new SQL.Database();
  }

  _db = makeDb(sqlDb);

  // ── Core tables ──────────────────────────────────────────────────────────
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      logo_url TEXT,
      company_name TEXT DEFAULT 'SysFlowCloudi',
      seller_commission_type TEXT DEFAULT 'percent',
      seller_commission_value REAL DEFAULT 10,
      tech_commission_value REAL DEFAULT 50,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      photo_url TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS passwords (
      user_id INTEGER PRIMARY KEY,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      birth_date TEXT,
      whatsapp TEXT,
      cep TEXT,
      street TEXT,
      number TEXT,
      complement TEXT,
      neighborhood TEXT,
      city TEXT,
      state TEXT,
      due_day INTEGER,
      status TEXT DEFAULT 'pendente',
      seller_id INTEGER,
      plan_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      speed TEXT NOT NULL,
      price REAL NOT NULL,
      benefits TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_number TEXT UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      technician_id INTEGER,
      seller_id INTEGER,
      scheduled_date TEXT,
      status TEXT DEFAULT 'pendente',
      observations TEXT,
      photo_cto_open TEXT,
      photo_cto_closed TEXT,
      photo_signal_cto TEXT,
      photo_meter TEXT,
      photo_mac TEXT,
      photo_onu TEXT,
      photo_speedtest TEXT,
      drop_start TEXT,
      drop_end TEXT,
      drop_total REAL,
      mat_esticador INTEGER DEFAULT 0,
      mat_conector INTEGER DEFAULT 0,
      mat_bucha INTEGER DEFAULT 0,
      mat_fixa_cabo INTEGER DEFAULT 0,
      tech_observations TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS os_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL,
      from_user_id INTEGER,
      to_user_id INTEGER NOT NULL,
      reason TEXT,
      transferred_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Solicitation tokens table ────────────────────────────────────────────
  sqlDb.run(`CREATE TABLE IF NOT EXISTS solicitation_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    created_by INTEGER,
    used INTEGER DEFAULT 0,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Solicitations table ───────────────────────────────────────────────────
  sqlDb.run(`CREATE TABLE IF NOT EXISTS solicitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cpf TEXT,
    birth_date TEXT,
    whatsapp TEXT,
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    plan_id INTEGER,
    install_period TEXT,
    observations TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Migrations for existing DBs ──────────────────────────────────────────
  const migrations = [
    `ALTER TABLE settings ADD COLUMN seller_commission_type TEXT DEFAULT 'percent'`,
    `ALTER TABLE settings ADD COLUMN seller_commission_value REAL DEFAULT 10`,
    `ALTER TABLE settings ADD COLUMN tech_commission_value REAL DEFAULT 50`,
    `ALTER TABLE service_orders ADD COLUMN photo_cto_open TEXT`,
    `ALTER TABLE service_orders ADD COLUMN photo_cto_closed TEXT`,
    `ALTER TABLE service_orders ADD COLUMN photo_mac TEXT`,
    `ALTER TABLE service_orders ADD COLUMN latitude REAL`,
    `ALTER TABLE service_orders ADD COLUMN longitude REAL`,
    `ALTER TABLE service_orders ADD COLUMN geo_address TEXT`,
    `ALTER TABLE service_orders ADD COLUMN readable_id TEXT`,
    `CREATE TABLE IF NOT EXISTS os_transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, from_user_id INTEGER, to_user_id INTEGER NOT NULL, reason TEXT, transferred_at TEXT DEFAULT (datetime('now')))`,
    `ALTER TABLE service_orders ADD COLUMN payment_seller_status TEXT DEFAULT 'pendente'`,
    `ALTER TABLE service_orders ADD COLUMN payment_tech_status TEXT DEFAULT 'pendente'`,
    `ALTER TABLE service_orders ADD COLUMN payment_seller_at TEXT`,
    `ALTER TABLE service_orders ADD COLUMN payment_tech_at TEXT`,
    `ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL`,
    `ALTER TABLE settings ADD COLUMN role_permissions TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN gold_fibra_id TEXT DEFAULT NULL`,
    `ALTER TABLE clients ADD COLUMN observations TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN pppoe_user TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN pppoe_pass TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN cto_number TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN cto_port TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN signal_cto REAL DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN signal_client REAL DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN wifi_ssid TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN wifi_pass TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN mac_equipment TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN fiber_lot TEXT DEFAULT NULL`,
    `ALTER TABLE chat_messages ADD COLUMN media_url TEXT DEFAULT NULL`,
    `ALTER TABLE chat_messages ADD COLUMN media_type TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN tipo_ordem_servico TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN valor_servico REAL DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN status_pagamento_tecnico TEXT DEFAULT 'pendente'`,
    `ALTER TABLE settings ADD COLUMN valores_por_tipo TEXT DEFAULT NULL`,
    `CREATE TABLE IF NOT EXISTS tipos_ordem_servico (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE, valor_padrao REAL NOT NULL DEFAULT 0, ativo INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
    `ALTER TABLE service_orders ADD COLUMN tipo_os_id INTEGER DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN seller_status TEXT DEFAULT 'pendente'`,
    `ALTER TABLE service_orders ADD COLUMN admin_message TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN install_period TEXT DEFAULT NULL`,
    `ALTER TABLE solicitations ADD COLUMN email TEXT DEFAULT NULL`,
    `ALTER TABLE clients ADD COLUMN email TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN fiber_spool_total REAL DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN fiber_spool_remaining REAL DEFAULT NULL`,
    `ALTER TABLE clients ADD COLUMN commission_paid VARCHAR(10) DEFAULT NULL`,
    `ALTER TABLE solicitations ADD COLUMN seller_id INTEGER DEFAULT NULL`,
    `ALTER TABLE solicitations ADD COLUMN token TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN started_at TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN arrived_at TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN cancel_reason TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN cancel_description TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN cancel_photos TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN cancel_at TEXT DEFAULT NULL`,
    `ALTER TABLE service_orders ADD COLUMN client_signature TEXT DEFAULT NULL`,
  ];
  for (const m of migrations) {
    try { sqlDb.run(m); } catch (_) { /* column already exists */ }
  }

  // ── Tabela de Ocorrências de CTO ─────────────────────────────────────────
  sqlDb.run(`CREATE TABLE IF NOT EXISTS cto_occurrences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER,
    technician_id INTEGER NOT NULL,
    cto_number TEXT NOT NULL,
    problem_type TEXT NOT NULL,
    photos TEXT,
    latitude REAL,
    longitude REAL,
    geo_address TEXT,
    observations TEXT,
    notified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Tabela de Ordens de Manutenção ────────────────────────────────────────
  sqlDb.run(`CREATE TABLE IF NOT EXISTS maintenance_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    readable_id TEXT,
    origin_os_id INTEGER,
    origin_tech_id INTEGER NOT NULL,
    assigned_tech_id INTEGER,
    problem_type TEXT NOT NULL,
    cto_number TEXT NOT NULL,
    description TEXT NOT NULL,
    photos_before TEXT,
    photos_after TEXT,
    latitude_origin REAL,
    longitude_origin REAL,
    latitude_arrival REAL,
    longitude_arrival REAL,
    latitude_finish REAL,
    longitude_finish REAL,
    status TEXT DEFAULT 'aguardando',
    started_at TEXT,
    arrived_at TEXT,
    finished_at TEXT,
    tech_observations TEXT,
    notified_origin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Estoque de ONUs por técnico ──────────────────────────────────────────
  sqlDb.run(`CREATE TABLE IF NOT EXISTS tech_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tech_id INTEGER NOT NULL,
    mac_address TEXT NOT NULL UNIQUE,
    modelo TEXT,
    serial TEXT,
    status TEXT DEFAULT 'disponivel',
    client_id INTEGER,
    os_id INTEGER,
    obs TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    used_at TEXT
  )`);

  sqlDb.run(`CREATE TABLE IF NOT EXISTS tech_stock_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    tech_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    client_id INTEGER,
    os_id INTEGER,
    obs TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Seed default settings ────────────────────────────────────────────────
  const s = _db.prepare('SELECT COUNT(*) as c FROM settings').get();
  if (!s || s.c === 0) {
    _db.prepare(`INSERT INTO settings (id, company_name, seller_commission_type, seller_commission_value, tech_commission_value)
      VALUES (1, 'SysFlowCloudi', 'percent', 10, 50)`).run();
  }

  // ── Seed tipos_ordem_servico ─────────────────────────────────────────────
  const tipos = _db.prepare('SELECT COUNT(*) as c FROM tipos_ordem_servico').get();
  if (!tipos || tipos.c === 0) {
    const insertTipo = _db.prepare('INSERT INTO tipos_ordem_servico (nome, valor_padrao) VALUES (?, ?)');
    [
      ['Adesão / Ativação', 120],
      ['Mudança de Endereço', 80],
      ['Troca de Equipamento', 60],
      ['Retirada de Equipamento', 50],
      ['Troca de Drop (Rompimento)', 70],
    ].forEach(([nome, valor]) => { try { insertTipo.run(nome, valor); } catch (_) {} });
  }

  // ── Tabela providers (cadastro de provedores ISP) ─────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo_auth TEXT DEFAULT 'pppoe',
    ip_servidor TEXT,
    porta INTEGER DEFAULT 8728,
    tipo_integracao TEXT DEFAULT 'api',
    usuario TEXT,
    senha TEXT,
    token TEXT,
    vlan TEXT,
    perfil_velocidade TEXT,
    pool_ip TEXT,
    tipo_olt TEXT DEFAULT 'nenhuma',
    ip_olt TEXT,
    porta_olt INTEGER DEFAULT 23,
    usuario_olt TEXT,
    senha_olt TEXT,
    ativo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  // ── Tabela client_provisioning ────────────────────────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS client_provisioning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    provider_id INTEGER,
    login_pppoe TEXT,
    senha_pppoe TEXT,
    plano TEXT,
    mac_onu TEXT,
    serial_onu TEXT,
    status TEXT DEFAULT 'pendente',
    log TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();

  // ── Tabela quality_control ───────────────────────────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS quality_control (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER NOT NULL,
    status TEXT DEFAULT 'aguardando',
    correction_status TEXT DEFAULT NULL,
    supervisor_id INTEGER,
    supervisor_obs TEXT,
    supervisor_photos TEXT,
    tech_obs TEXT,
    tech_correction_photos TEXT,
    cycle INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run();
  // migration: adicionar correction_status se não existir
  try { _db.prepare("ALTER TABLE quality_control ADD COLUMN correction_status TEXT DEFAULT NULL").run(); } catch(_) {}

  // ── Tabela de biometria facial ────────────────────────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS face_biometrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    face_data TEXT NOT NULL,
    face_descriptor TEXT NOT NULL,
    liveness_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();

  // ═══════════════════════════════════════════════════════════════════════════════
  // TABELAS FINANCEIRAS
  // ═══════════════════════════════════════════════════════════════════════════════

  // ── Tabela de faturas/cobranças ────────────────────────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pendente',
    due_date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'boleto',
    paid_at TEXT,
    paid_amount REAL,
    pix_code TEXT,
    boleto_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`).run();

  // ── Tabela de despesas ─────────────────────────────────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'dinheiro',
    recurring INTEGER DEFAULT 0,
    receipt_url TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`).run();

  // ── Tabela de transações financeiras ───────────────────────────────────────
  _db.prepare(`CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    related_id INTEGER,
    related_type TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`).run();

  // ── Seed default admin ───────────────────────────────────────────────────
  const a = _db.prepare("SELECT COUNT(*) as c FROM users WHERE role='admin'").get();
  if (!a || a.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    const info = _db.prepare("INSERT INTO users (id, name, role) VALUES (?, ?, ?)").run('ID000001', 'Administrador', 'admin');
    _db.prepare("INSERT INTO passwords (user_id, hash) VALUES (?, ?)").run(info.lastInsertRowid, hash);
    console.log('Admin criado: ID=ID000001 / Senha=admin123');
  }

  return _db;
}

function getDb() { return _db; }

module.exports = { initDatabase, getDb };
