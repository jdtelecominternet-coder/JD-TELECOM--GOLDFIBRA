@echo off
echo Enviando Users.jsx...
scp -o StrictHostKeyChecking=no -o ConnectTimeout=20 "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\Users.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/Users.jsx
echo SCP: %errorlevel%
echo Fazendo build...
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=60 root@72.61.28.164 "cd /var/www/goldfibra/frontend && npm run build 2>&1 | tail -5 && pm2 restart all && echo DEPLOY_OK"
pause
