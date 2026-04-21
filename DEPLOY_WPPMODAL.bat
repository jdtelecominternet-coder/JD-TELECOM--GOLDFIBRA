@echo off
echo === DEPLOY TechnicalOrders.jsx ===
scp -o StrictHostKeyChecking=no -o ConnectTimeout=20 "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\TechnicalOrders.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/TechnicalOrders.jsx
echo SCP resultado: %errorlevel%
echo.
echo === FAZENDO BUILD NO SERVIDOR ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 root@72.61.28.164 "cd /var/www/goldfibra/frontend && npm run build 2>&1 | tail -10 && pm2 restart all && echo === DEPLOY_OK ==="
echo.
echo Pressione qualquer tecla para fechar...
pause
