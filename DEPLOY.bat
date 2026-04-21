@echo off
title Deploy JD TELECOM - GOLD FIBRA
echo ============================================
echo   Deploy para o servidor de hospedagem
echo   IP: 72.61.28.164
echo ============================================
echo.
echo INSTRUCOES:
echo   Quando pedir a senha, digite: @Suremi135706
echo   (pode pedir varias vezes, uma por arquivo)
echo.
echo Pressione qualquer tecla para iniciar...
pause >nul

set SERVER=root@72.61.28.164
set APP=/var/www/goldfibra
set BASE=C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)

echo.
echo [1/6] Enviando database.js...
scp -o StrictHostKeyChecking=no "%BASE%\backend\src\database.js" %SERVER%:%APP%/backend/src/database.js

echo [2/6] Enviando routes/stock.js...
scp -o StrictHostKeyChecking=no "%BASE%\backend\src\routes\stock.js" %SERVER%:%APP%/backend/src/routes/stock.js

echo [3/6] Enviando server.js...
scp -o StrictHostKeyChecking=no "%BASE%\backend\src\server.js" %SERVER%:%APP%/backend/src/server.js

echo [4/6] Enviando TechnicalOrders.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\pages\TechnicalOrders.jsx" %SERVER%:%APP%/frontend/src/pages/TechnicalOrders.jsx

echo [5/6] Enviando TechStock.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\components\TechStock.jsx" %SERVER%:%APP%/frontend/src/components/TechStock.jsx

echo [6/6] Enviando Users.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\pages\Users.jsx" %SERVER%:%APP%/frontend/src/pages/Users.jsx

echo.
echo ============================================
echo   Arquivos enviados! Fazendo build...
echo   (vai pedir a senha mais uma vez)
echo ============================================
ssh -o StrictHostKeyChecking=no %SERVER% "cd %APP%/frontend && npm run build && pm2 restart all && echo === DEPLOY CONCLUIDO ==="

echo.
echo ============================================
echo   DEPLOY FINALIZADO!
echo   O sistema ja esta atualizado no servidor.
echo ============================================
pause
