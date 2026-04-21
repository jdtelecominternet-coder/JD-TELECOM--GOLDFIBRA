@echo off
title Deploy - Mapa e Rota CQ
color 0A
set SERVER=root@72.61.28.164
set APP=/var/www/goldfibra
set BASE=C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)
set SCP=scp -o StrictHostKeyChecking=no

echo [1/2] Enviando QualityControl.jsx (supervisor com mapa)...
%SCP% "%BASE%\frontend\src\pages\QualityControl.jsx" %SERVER%:%APP%/frontend/src/pages/QualityControl.jsx

echo [2/2] Enviando TechnicalOrders.jsx (tecnico com mapa)...
%SCP% "%BASE%\frontend\src\pages\TechnicalOrders.jsx" %SERVER%:%APP%/frontend/src/pages/TechnicalOrders.jsx

echo.
echo Fazendo build e reiniciando...
ssh -o StrictHostKeyChecking=no %SERVER% "cd %APP%/frontend && npm run build 2>&1 | tail -3 && pm2 restart all && echo === DEPLOY CONCLUIDO ==="

echo.
pause
