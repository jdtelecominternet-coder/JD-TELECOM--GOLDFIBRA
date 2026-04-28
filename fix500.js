const {execSync}=require('child_process');
const key=process.env.USERPROFILE+'\\.ssh\\deploy_key';
const ssh=cmd=>{try{return execSync(`"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${key}" -o StrictHostKeyChecking=no root@72.61.28.164 "${cmd}"`,{encoding:'utf8',timeout:15000});}catch(e){return e.stdout||e.message;}};

console.log('=== Nginx error log ===');
console.log(ssh('tail -20 /var/log/nginx/error.log'));
console.log('=== Permissoes frontend ===');
console.log(ssh('ls -la /var/www/goldfibra/frontend/index.html'));
console.log('=== Fix permissoes ===');
console.log(ssh('chmod -R 755 /var/www/goldfibra/frontend && chown -R www-data:www-data /var/www/goldfibra/frontend && chmod 644 /var/www/goldfibra/frontend/index.html && echo OK'));
console.log('=== Nginx test ===');
console.log(ssh('nginx -t 2>&1'));
console.log(ssh('systemctl restart nginx && echo NGINX_OK'));
