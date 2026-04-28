const {execSync}=require('child_process');
const key=process.env.USERPROFILE+'\\.ssh\\deploy_key';
const ssh=cmd=>{
  try{return execSync(`"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${key}" -o StrictHostKeyChecking=no root@72.61.28.164 "${cmd}"`,{encoding:'utf8',timeout:15000});}
  catch(e){return e.stdout||e.message;}
};
console.log('=== Arquivos frontend ===');
console.log(ssh('ls -la /var/www/goldfibra/frontend/'));
console.log('=== Permissoes index.html ===');
console.log(ssh('stat /var/www/goldfibra/frontend/index.html 2>/dev/null || echo NAO_EXISTE'));
console.log('=== HTTP local ===');
console.log(ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost'));
console.log('=== Nginx config ===');
console.log(ssh('grep -A5 "root" /etc/nginx/sites-enabled/goldfibra | head -10'));
