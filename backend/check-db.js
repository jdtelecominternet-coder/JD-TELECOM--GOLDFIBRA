const { initDatabase } = require('./src/database.js');

async function check() {
  const db = await initDatabase();
  
  const clients = db.prepare('SELECT COUNT(*) as c FROM clients').get();
  const plans = db.prepare('SELECT COUNT(*) as c FROM plans').get();
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get();
  
  console.log('========================================');
  console.log('VERIFICAÇÃO DO BANCO DE DADOS');
  console.log('========================================');
  console.log('Clientes:', clients.c);
  console.log('Planos:', plans.c);
  console.log('Usuários:', users.c);
  
  if (clients.c === 0) {
    console.log('\n⚠️ ALERTA: Nenhum cliente encontrado!');
    console.log('Execute: node seed-complete.js');
  }
  if (plans.c === 0) {
    console.log('\n⚠️ ALERTA: Nenhum plano encontrado!');
    console.log('Execute: node seed-complete.js');
  }
  
  console.log('\n========================================');
  process.exit(0);
}

check().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
