const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'C:\\Users\\User\\Downloads\\remix_-jd-telecom---gold-fibra (3)';
const KEY = process.env.USERPROFILE + '\\.ssh\\deploy_key';
const HOST = 'root@72.61.28.164';
const SSH = `"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${KEY}" -o StrictHostKeyChecking=no ${HOST}`;
const SCP = `"C:\\Windows\\System32\\OpenSSH\\scp.exe" -i "${KEY}" -o StrictHostKeyChecking=no`;

function ssh(cmd) {
  try {
    const r = execSync(`${SSH} "${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 30000 });
    return r.trim();
  } catch(e) { return e.stdout || e.message; }
}

function scpFile(local, remote) {
  try {
    execSync(`${SCP} "${local}" "${HOST}:${remote}"`, { encoding: 'utf8', timeout: 30000 });
    return true;
  } catch(e) { console.error('SCP erro:', e.message); return false; }
}

function scpDir(localDir, remoteDir) {
  try {
    execSync(`${SCP} -r "${localDir}" "${HOST}:${remoteDir}"`, { encoding: 'utf8', timeout: 120000 });
    return true;
  } catch(e) { console.error('SCP dir erro:', e.message); return false; }
}

async function deploy() {
  console.log('✓ Iniciando deploy via SSH nativo...\n');

  // 1. Frontend (dist)
  console.log('📦 Enviando frontend...');
  ssh('rm -rf /var/www/goldfibra/frontend/*');
  if (scpDir(path.join(BASE, 'frontend', 'dist') + '\\*'.replace('\\*',''), '/var/www/goldfibra/frontend/')) {
    console.log('  ✅ Frontend enviado');
  }

  // 2. Backend files
  const backendFiles = [
    ['backend/src/server.js', '/var/www/goldfibra/backend/src/server.js'],
    ['backend/src/database.js', '/var/www/goldfibra/backend/src/database.js'],
    ['backend/src/routes/orders.js', '/var/www/goldfibra/backend/src/routes/orders.js'],
    ['backend/src/routes/clients.js', '/var/www/goldfibra/backend/src/routes/clients.js'],
    ['backend/src/routes/settings.js', '/var/www/goldfibra/backend/src/routes/settings.js'],
    ['backend/src/routes/stock.js', '/var/www/goldfibra/backend/src/routes/stock.js'],
    ['backend/src/routes/qualityControl.js', '/var/www/goldfibra/backend/src/routes/qualityControl.js'],
    ['backend/src/routes/dashboard.js', '/var/www/goldfibra/backend/src/routes/dashboard.js'],
    ['backend/src/routes/solicitations.js', '/var/www/goldfibra/backend/src/routes/solicitations.js'],
    ['backend/src/routes/tiposOs.js', '/var/www/goldfibra/backend/src/routes/tiposOs.js'],
  ];

  console.log('\n🔧 Enviando backend...');
  for (const [local, remote] of backendFiles) {
    const localPath = path.join(BASE, local);
    if (fs.existsSync(localPath)) {
      if (scpFile(localPath, remote)) console.log(`  ✅ ${local.split('/').pop()}`);
    }
  }

  // 3. Reiniciar PM2
  console.log('\n🔄 Reiniciando backend...');
  console.log(ssh('pm2 restart goldfibra && sleep 2 && pm2 list --no-color | grep goldfibra'));

  // 4. Corrigir permissões do frontend
  console.log('\n🔐 Corrigindo permissões...');
  console.log(ssh('chmod -R 755 /var/www/goldfibra/frontend && chown -R www-data:www-data /var/www/goldfibra/frontend && echo "Permissões OK"'));

  // 5. Recarregar nginx
  console.log('\n🌐 Recarregando nginx...');
  console.log(ssh('systemctl reload nginx && echo "nginx OK"'));

  console.log('\n✅ DEPLOY CONCLUÍDO! Acesse https://jdtelecom.online');
}

deploy().catch(console.error);
