const { initDatabase } = require('./src/database.js');
const bcrypt = require('bcryptjs');

async function seedData() {
  console.log('Iniciando seed de dados...\n');
  
  const db = await initDatabase();
  
  // 1. Verificar/criar admin principal
  const adminCheck = db.prepare("SELECT * FROM users WHERE jd_id='000001'").get();
  if (!adminCheck) {
    console.log('Criando administrador principal (000001)...');
    const hash = bcrypt.hashSync('admin123', 10);
    const info = db.prepare("INSERT INTO users (jd_id, name, role, email, active) VALUES (?, ?, ?, ?, ?)")
      .run('000001', 'Administrador Principal', 'admin', 'admin@sysflowcloudi.com', 1);
    db.prepare("INSERT INTO passwords (user_id, hash) VALUES (?, ?)").run(info.lastInsertRowid, hash);
    console.log('✓ Admin criado: ID=000001 / Senha=admin123\n');
  } else {
    console.log('✓ Admin principal já existe:', adminCheck.jd_id, adminCheck.name);
    // Resetar senha do admin
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("UPDATE passwords SET hash=? WHERE user_id=?").run(hash, adminCheck.id);
    console.log('✓ Senha do admin resetada para: admin123\n');
  }
  
  // 2. Criar planos
  const plansCount = db.prepare("SELECT COUNT(*) as c FROM plans").get();
  if (plansCount.c === 0) {
    console.log('Criando planos...');
    const plans = [
      ['Plano Básico', '50 Mega', 79.90],
      ['Plano Intermediário', '100 Mega', 99.90],
      ['Plano Avançado', '300 Mega', 149.90],
      ['Plano Premium', '500 Mega', 199.90]
    ];
    const insert = db.prepare("INSERT INTO plans (name, speed, price, active) VALUES (?, ?, ?, 1)");
    plans.forEach(p => insert.run(p[0], p[1], p[2]));
    console.log('✓ 4 planos criados\n');
  } else {
    console.log('✓ Planos já existem:', plansCount.c, 'planos\n');
  }
  
  // 3. Criar clientes
  const clientsCount = db.prepare("SELECT COUNT(*) as c FROM clients").get();
  if (clientsCount.c === 0) {
    console.log('Criando clientes...');
    const clients = [
      ['João Silva', '123.456.789-00', '(11) 98765-4321', 'Rua A', '123', 'Centro', 'São Paulo', 'SP', 1, 10],
      ['Maria Santos', '987.654.321-00', '(11) 91234-5678', 'Rua B', '456', 'Jardim', 'São Paulo', 'SP', 2, 15],
      ['Pedro Oliveira', '456.789.123-00', '(11) 95678-1234', 'Rua C', '789', 'Vila', 'São Paulo', 'SP', 3, 20],
      ['Ana Costa', '789.123.456-00', '(11) 94321-8765', 'Rua D', '321', 'Bairro', 'São Paulo', 'SP', 1, 25],
      ['Carlos Souza', '321.654.987-00', '(11) 96789-4321', 'Rua E', '654', 'Centro', 'São Paulo', 'SP', 2, 5]
    ];
    const insert = db.prepare(`INSERT INTO clients 
      (name, cpf, whatsapp, street, number, neighborhood, city, state, plan_id, due_day, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')`);
    clients.forEach(c => insert.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9]));
    console.log('✓ 5 clientes criados\n');
  } else {
    console.log('✓ Clientes já existem:', clientsCount.c, 'clientes\n');
  }
  
  // 4. Criar usuários de teste
  const usersCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role!='admin'").get();
  if (usersCount.c === 0) {
    console.log('Criando usuários de teste...');
    
    // Vendedor
    const vHash = bcrypt.hashSync('vendedor123', 10);
    const vInfo = db.prepare("INSERT INTO users (jd_id, name, role, email, active) VALUES (?, ?, ?, ?, ?)")
      .run('000002', 'Vendedor Teste', 'vendedor', 'vendedor@teste.com', 1);
    db.prepare("INSERT INTO passwords (user_id, hash) VALUES (?, ?)").run(vInfo.lastInsertRowid, vHash);
    console.log('✓ Vendedor criado: ID=000002 / Senha=vendedor123');
    
    // Técnico
    const tHash = bcrypt.hashSync('tecnico123', 10);
    const tInfo = db.prepare("INSERT INTO users (jd_id, name, role, email, active) VALUES (?, ?, ?, ?, ?)")
      .run('000003', 'Técnico Teste', 'tecnico', 'tecnico@teste.com', 1);
    db.prepare("INSERT INTO passwords (user_id, hash) VALUES (?, ?)").run(tInfo.lastInsertRowid, tHash);
    console.log('✓ Técnico criado: ID=000003 / Senha=tecnico123');
    
    // Técnico de Rede
    const trHash = bcrypt.hashSync('redes123', 10);
    const trInfo = db.prepare("INSERT INTO users (jd_id, name, role, email, active) VALUES (?, ?, ?, ?, ?)")
      .run('000004', 'Técnico Rede Teste', 'tecnico_rede', 'redes@teste.com', 1);
    db.prepare("INSERT INTO passwords (user_id, hash) VALUES (?, ?)").run(trInfo.lastInsertRowid, trHash);
    console.log('✓ Técnico Rede criado: ID=000004 / Senha=redes123\n');
  } else {
    console.log('✓ Usuários de teste já existem\n');
  }
  
  // 5. Criar ordens de serviço
  const osCount = db.prepare("SELECT COUNT(*) as c FROM service_orders").get();
  if (osCount.c === 0) {
    console.log('Criando ordens de serviço...');
    const orders = [
      [1, 3, 'pendente'],
      [2, 3, 'em_andamento'],
      [3, 3, 'concluida'],
      [4, 3, 'pendente'],
      [5, 4, 'pendente']
    ];
    const insert = db.prepare(`INSERT INTO service_orders 
      (os_number, client_id, technician_id, plan_id, status, created_at) 
      VALUES (?, ?, ?, ?, ?, datetime('now'))`);
    orders.forEach((o, i) => insert.run('OS' + String(i+1).padStart(5, '0'), o[0], o[1], o[0], o[2]));
    console.log('✓ 5 ordens de serviço criadas\n');
  } else {
    console.log('✓ Ordens de serviço já existem:', osCount.c, 'OS\n');
  }
  
  console.log('========================================');
  console.log('SEED CONCLUÍDO COM SUCESSO!');
  console.log('========================================');
  console.log('\nCredenciais de acesso:');
  console.log('  Admin:     000001 / admin123');
  console.log('  Vendedor:  000002 / vendedor123');
  console.log('  Técnico:   000003 / tecnico123');
  console.log('  Téc. Rede: 000004 / redes123');
  
  process.exit(0);
}

seedData().catch(e => {
  console.error('Erro:', e);
  process.exit(1);
});
