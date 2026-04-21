@echo off
echo Enviando arquivos...
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\components\TechStock.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/components/TechStock.jsx
echo TechStock: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\TechnicalOrders.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/TechnicalOrders.jsx
echo TechnicalOrders: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\QualityControl.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/QualityControl.jsx
echo QualityControl: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\components\Layout.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/components/Layout.jsx
echo Layout: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\src\pages\Users.jsx" root@72.61.28.164:/var/www/goldfibra/frontend/src/pages/Users.jsx
echo Users: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\backend\src\routes\stock.js" root@72.61.28.164:/var/www/goldfibra/backend/src/routes/stock.js
echo stock.js: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\backend\src\routes\qualityControl.js" root@72.61.28.164:/var/www/goldfibra/backend/src/routes/qualityControl.js
echo qualityControl: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\backend\src\server.js" root@72.61.28.164:/var/www/goldfibra/backend/src/server.js
echo server.js: %errorlevel%
scp -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\backend\src\database.js" root@72.61.28.164:/var/www/goldfibra/backend/src/database.js
echo database.js: %errorlevel%
echo.
echo Fazendo build e restart...
ssh -o StrictHostKeyChecking=no root@72.61.28.164 "cd /var/www/goldfibra/frontend && npm run build 2>&1 | tail -5 && pm2 restart all && echo DEPLOY_OK"
pause
