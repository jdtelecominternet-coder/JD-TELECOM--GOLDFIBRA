const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = { host: '72.61.28.164', port: 22, username: 'root', password: '@Rebecca135706' };

const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = path.join(__dirname, 'backups', `database_backup_${date}.sqlite3`);

const conn = new Client();
conn.on('ready', () => {
  console.log('✓ Conectado. Baixando banco de dados...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('Erro SFTP:', err); return conn.end(); }

    const remote = '/var/www/sysflowcloudi/database.sqlite3.bin';
    sftp.fastGet(remote, backupPath, { step: (total, nb, fsize) => {
      process.stdout.write(`\r  Baixando: ${Math.round((total/fsize)*100)}%`);
    }}, (err) => {
      if (err) { console.error('\nErro ao baixar:', err); }
      else {
        const size = fs.statSync(backupPath).size;
        console.log(`\n✅ Backup salvo em:`);
        console.log(`   ${backupPath}`);
        console.log(`   Tamanho: ${(size/1024).toFixed(1)} KB`);
        console.log(`   Data: ${new Date().toLocaleString('pt-BR')}`);
      }
      conn.end();
    });
  });
});
conn.connect(config);
