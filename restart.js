const {execSync}=require('child_process');
const key=process.env.USERPROFILE+'\\.ssh\\deploy_key';
const ssh=cmd=>{try{return execSync(`"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${key}" -o StrictHostKeyChecking=no root@72.61.28.164 "${cmd}"`,{encoding:'utf8',timeout:20000});}catch(e){return e.stdout||e.message;}};
console.log(ssh('pm2 restart goldfibra && sleep 3 && pm2 list --no-color | grep goldfibra'));
console.log(ssh('pm2 logs goldfibra --err --lines 15 --nostream'));
