@echo off
echo Enviando Users.jsx...
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\Users.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/Users.jsx
echo SCP resultado: %errorlevel%
echo Fazendo build...
ssh -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no -o ConnectTimeout=60 root@72.61.28.164 "cd /var/www/goldfibra/frontend && npm run build 2>&1 | tail -5 && pm2 restart all && echo DEPLOY_OK"
pause
