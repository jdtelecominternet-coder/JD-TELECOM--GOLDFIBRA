const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
try {
  db.prepare('ALTER TABLE service_orders ADD COLUMN gold_fibra_id TEXT DEFAULT NULL').run();
  console.log('Coluna adicionada!');
} catch(e) {
  console.log(e.message.includes('duplicate') ? 'Coluna ja existe' : 'Erro: ' + e.message);
}
db.close();
