const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database.sqlite'));

console.log('Criando dados de exemplo...');

// Planos
db.exec(`
  INSERT OR IGNORE INTO plans (name, price, speed, active) VALUES
  ('Plano Básico', 79.90, '50 Mega', 1),
  ('Plano Intermediário', 99.90, '100 Mega', 1),
  ('Plano Avançado', 149.90, '300 Mega', 1),
  ('Plano Premium', 199.90, '500 Mega', 1);
`);

// Clientes
db.exec(`
  INSERT OR IGNORE INTO clients (name, cpf, email, phone, address, plan_id, active) VALUES
  ('João Silva', '123.456.789-00', 'joao@email.com', '(11) 98765-4321', 'Rua A, 123 - Centro', 1, 1),
  ('Maria Santos', '987.654.321-00', 'maria@email.com', '(11) 91234-5678', 'Rua B, 456 - Jardim', 2, 1),
  ('Pedro Oliveira', '456.789.123-00', 'pedro@email.com', '(11) 95678-1234', 'Rua C, 789 - Vila', 3, 1),
  ('Ana Costa', '789.123.456-00', 'ana@email.com', '(11) 94321-8765', 'Rua D, 321 - Bairro', 1, 1),
  ('Carlos Souza', '321.654.987-00', 'carlos@email.com', '(11) 96789-4321', 'Rua E, 654 - Centro', 2, 1);
`);

// Técnicos
const bcrypt = require('bcryptjs');
const techs = [
  { jd_id: 'ID000002', name: 'Técnico João', email: 'tecnico1@sysflowcloudi.com', role: 'tecnico' },
  { jd_id: 'ID000003', name: 'Técnico Maria', email: 'tecnico2@sysflowcloudi.com', role: 'tecnico' },
  { jd_id: 'ID000004', name: 'Vendedor Pedro', email: 'vendedor@sysflowcloudi.com', role: 'vendedor' }
];

techs.forEach(tech => {
  const exists = db.prepare('SELECT id FROM users WHERE jd_id = ?').get(tech.jd_id);
  if (!exists) {
    const result = db.prepare('INSERT INTO users (jd_id, name, email, role, active) VALUES (?, ?, ?, ?, ?)')
      .run(tech.jd_id, tech.name, tech.email, tech.role, 1);
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare('INSERT INTO passwords (user_id, hash) VALUES (?, ?)').run(result.lastInsertRowid, hash);
    console.log(`Técnico criado: ${tech.jd_id} / 123456`);
  }
});

// Ordens de Serviço
db.exec(`
  INSERT OR IGNORE INTO service_orders (client_id, technician_id, status, created_at) VALUES
  (1, 2, 'pendente', datetime('now', '-2 days')),
  (2, 2, 'em_andamento', datetime('now', '-1 day')),
  (3, 3, 'concluida', datetime('now', '-3 days')),
  (4, 2, 'pendente', datetime('now')),
  (5, 3, 'cancelada', datetime('now', '-5 days'));
`);

console.log('Dados de exemplo criados com sucesso!');
console.log('');
console.log('Logins disponíveis:');
console.log('- Admin: ID000001 / admin123');
console.log('- Técnicos: ID000002, ID000003 / 123456');
console.log('- Vendedor: ID000004 / 123456');