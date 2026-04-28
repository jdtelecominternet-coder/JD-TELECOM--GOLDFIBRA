const {execSync}=require('child_process');
const key=process.env.USERPROFILE+'\\.ssh\\deploy_key';
const ssh=cmd=>{try{return execSync(`"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -i "${key}" -o StrictHostKeyChecking=no root@72.61.28.164 "${cmd}"`,{encoding:'utf8',timeout:30000});}catch(e){return e.stdout||e.message;}};
console.log(ssh('node /tmp/fix_pw.js'));
