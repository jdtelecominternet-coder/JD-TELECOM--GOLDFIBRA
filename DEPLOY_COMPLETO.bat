@echo off
title DEPLOY COMPLETO - JD TELECOM GOLD FIBRA
color 0B
echo.
echo ================================================
echo   DEPLOY COMPLETO - JD TELECOM GOLD FIBRA
echo   Servidor: 72.61.28.164
echo ================================================
echo.

set SERVER=root@72.61.28.164
set APP=/var/www/goldfibra
set BASE=C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)
set KEY=%USERPROFILE%\.ssh\id_rsa
set SSH=ssh -o StrictHostKeyChecking=no -i "%KEY%"
set SCP=scp -o StrictHostKeyChecking=no -i "%KEY%"

echo [TESTE] Conectando ao servidor...
%SSH% %SERVER% "echo === CONEXAO OK ===" 2>&1
if errorlevel 1 (
    echo ERRO: Falha na conexao. Tentando sem chave...
    set SSH=ssh -o StrictHostKeyChecking=no
    set SCP=scp -o StrictHostKeyChecking=no
    %SSH% %SERVER% "echo === CONEXAO OK ==="
)

echo.
echo [1/9] Enviando database.js (novas tabelas)...
%SCP% "%BASE%\backend\src\database.js" %SERVER%:%APP%/backend/src/database.js

echo [2/9] Enviando qualityControl.js (corrigido)...
%SCP% "%BASE%\backend\src\routes\qualityControl.js" %SERVER%:%APP%/backend/src/routes/qualityControl.js

echo [3/9] Enviando stock.js (novo modulo estoque)...
%SCP% "%BASE%\backend\src\routes\stock.js" %SERVER%:%APP%/backend/src/routes/stock.js

echo [4/9] Enviando server.js...
%SCP% "%BASE%\backend\src\server.js" %SERVER%:%APP%/backend/src/server.js

echo [5/9] Enviando users.js (backend)...
%SCP% "%BASE%\backend\src\routes\users.js" %SERVER%:%APP%/backend/src/routes/users.js

echo [6/9] Enviando TechnicalOrders.jsx...
%SCP% "%BASE%\frontend\src\pages\TechnicalOrders.jsx" %SERVER%:%APP%/frontend/src/pages/TechnicalOrders.jsx

echo [7/9] Enviando TechStock.jsx (novo)...
%SCP% "%BASE%\frontend\src\components\TechStock.jsx" %SERVER%:%APP%/frontend/src/components/TechStock.jsx

echo [8/9] Enviando Users.jsx...
%SCP% "%BASE%\frontend\src\pages\Users.jsx" %SERVER%:%APP%/frontend/src/pages/Users.jsx

echo [9/9] Enviando Layout.jsx...
%SCP% "%BASE%\frontend\src\components\Layout.jsx" %SERVER%:%APP%/frontend/src/components/Layout.jsx

echo.
echo ================================================
echo   Fazendo BUILD do frontend no servidor...
echo ================================================
%SSH% %SERVER% "cd %APP%/frontend && npm run build 2>&1 | tail -5"

echo.
echo ================================================
echo   Fazendo BACKUP do banco de dados...
echo ================================================
%SSH% %SERVER% "cp %APP%/database.sqlite3.bin %APP%/database.sqlite3.bin.bak_$(date +%%Y%%m%%d_%%H%%M%%S) && echo BACKUP CRIADO"

echo.
echo ================================================
echo   Reiniciando servidor (PM2)...
echo ================================================
%SSH% %SERVER% "pm2 restart all && sleep 2 && pm2 list"

echo.
echo ================================================
echo   DEPLOY FINALIZADO COM SUCESSO!
echo   Sistema atualizado em: http://72.61.28.164
echo ================================================
pause
