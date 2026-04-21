@echo off
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\components\Layout.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/components/Layout.jsx
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\App.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/App.jsx
echo Arquivos enviados: %errorlevel%
ssh -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no root@72.61.28.164 "cd /var/www/goldfibra/frontend && npm run build 2>&1 | tail -5 && pm2 restart all && echo DEPLOY_OK"
pause
