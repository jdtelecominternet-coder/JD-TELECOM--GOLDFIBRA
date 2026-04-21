@echo off
echo Enviando settings.js e Users.jsx...
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\backend\src\routes\settings.js" root@72.61.28.164:/var/www/goldfibra/backend/src/routes/settings.js
echo settings.js: %errorlevel%
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\Users.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/Users.jsx
echo Users.jsx: %errorlevel%
echo Fazendo build e restart...
ssh -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no root@72.61.28.164 "cd /var/www/goldfibra/frontend && npm run build 2>&1 | tail -5 && pm2 restart all && echo DEPLOY_OK"
pause
