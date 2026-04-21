@echo off
title DEPLOY - Controle de Qualidade + Notificacoes
color 0A
set SERVER=root@72.61.28.164
set APP=/var/www/goldfibra
set BASE=C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)

echo [1/7] backend/routes/qualityControl.js...
scp -o StrictHostKeyChecking=no "%BASE%\backend\src\routes\qualityControl.js" %SERVER%:%APP%/backend/src/routes/qualityControl.js

echo [2/7] backend/routes/users.js...
scp -o StrictHostKeyChecking=no "%BASE%\backend\src\routes\users.js" %SERVER%:%APP%/backend/src/routes/users.js

echo [3/7] frontend/pages/QualityControl.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\pages\QualityControl.jsx" %SERVER%:%APP%/frontend/src/pages/QualityControl.jsx

echo [4/7] frontend/pages/TechnicalOrders.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\pages\TechnicalOrders.jsx" %SERVER%:%APP%/frontend/src/pages/TechnicalOrders.jsx

echo [5/7] frontend/pages/Users.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\pages\Users.jsx" %SERVER%:%APP%/frontend/src/pages/Users.jsx

echo [6/7] frontend/components/Layout.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\components\Layout.jsx" %SERVER%:%APP%/frontend/src/components/Layout.jsx

echo [7/7] frontend/components/TechStock.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\components\TechStock.jsx" %SERVER%:%APP%/frontend/src/components/TechStock.jsx

echo.
echo Build + Restart...
ssh -o StrictHostKeyChecking=no %SERVER% "cd %APP%/frontend && npm run build 2>&1 | tail -4 && pm2 restart all && echo === DEPLOY CONCLUIDO ==="

echo.
pause
