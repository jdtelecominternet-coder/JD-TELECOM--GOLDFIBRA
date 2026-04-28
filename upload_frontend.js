const {execSync}=require('child_process');
const fs=require('fs');
const path=require('path');
const key=process.env.USERPROFILE+'\\.ssh\\deploy_key';
const HOST='root@72.61.28.164';
const SCP=`"C:\\Windows\\System32\\OpenSSH\\scp.exe" -i "${key}" -o StrictHostKeyChecking=no`;
const SSH=`"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${key}" -o StrictHostKeyChecking=no ${HOST}`;
const ssh=cmd=>{try{return execSync(`${SSH} "${cmd}"`,{encoding:'utf8',timeout:30000});}catch(e){return e.stdout||e.message;}};

const distDir = path.join('C:\\Users\\User\\Downloads\\remix_-jd-telecom---gold-fibra (3)\\frontend\\dist');

// Limpar e recriar pasta no servidor
console.log('Limpando pasta frontend no servidor...');
console.log(ssh('rm -rf /var/www/goldfibra/frontend && mkdir -p /var/www/goldfibra/frontend'));

// Enviar cada arquivo do dist diretamente
function sendDir(localDir, remoteDir) {
  const items = fs.readdirSync(localDir);
  for (const item of items) {
    const localPath = path.join(localDir, item);
    const remotePath = remoteDir + '/' + item;
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      ssh(`mkdir -p ${remotePath}`);
      sendDir(localPath, remotePath);
    } else {
      try {
        execSync(`${SCP} "${localPath}" "${HOST}:${remotePath}"`, {encoding:'utf8', timeout:30000});
        process.stdout.write('.');
      } catch(e) { console.error('\nErro:', item, e.message); }
    }
  }
}

console.log('Enviando arquivos...');
sendDir(distDir, '/var/www/goldfibra/frontend');
console.log('\nCorrigindo permissoes...');
console.log(ssh('chmod -R 755 /var/www/goldfibra/frontend && chown -R www-data:www-data /var/www/goldfibra/frontend && echo OK'));
console.log('Verificando index.html...');
console.log(ssh('ls -la /var/www/goldfibra/frontend/index.html'));
console.log('Reiniciando nginx...');
console.log(ssh('systemctl restart nginx && echo NGINX_OK'));
console.log('Testando...');
console.log(ssh('curl -s -o /dev/null -w "%{http_code}" https://jdtelecom.online'));
