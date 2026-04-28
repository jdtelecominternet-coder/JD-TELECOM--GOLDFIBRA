const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = { host: '72.61.28.164', port: 22, username: 'root', password: '@Rebecca135706' };

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error(err); return conn.end(); }

    const file = path.join(__dirname, 'backend', 'src', 'routes', 'orders.js');
    sftp.fastPut(file, '/var/www/sysflowcloudi/backend/src/routes/orders.js', {}, (err) => {
      if (err) { console.error('Erro:', err); conn.end(); return; }
      console.log('✅ orders.js enviado');
      conn.exec('pm2 restart sysflowcloudi && sleep 2 && pm2 list --no-color | grep sysflowcloudi', (err, stream) => {
        let out = '';
        stream.on('data', d => out += d);
        stream.stderr.on('data', d => out += d);
        stream.on('close', () => { console.log(out); conn.end(); });
      });
    });
  });
});
conn.connect(config);
