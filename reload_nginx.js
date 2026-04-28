const {execSync}=require('child_process');
const key=process.env.USERPROFILE+'\\.ssh\\deploy_key';
const ssh=cmd=>{try{return execSync(`"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${key}" -o StrictHostKeyChecking=no root@72.61.28.164 "${cmd}"`,{encoding:'utf8',timeout:15000});}catch(e){return e.stdout||e.message;}};
console.log(ssh('systemctl restart nginx && sleep 1 && curl -s -o /dev/null -w "%{http_code}" http://localhost'));
