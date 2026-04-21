@echo off
title DEPLOY TECHSTOCK
color 0A
set SERVER=root@72.61.28.164
set APP=/var/www/goldfibra
set BASE=C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)

echo [1] Enviando TechStock.jsx...
scp -o StrictHostKeyChecking=no "%BASE%\frontend\src\components\TechStock.jsx" %SERVER%:%APP%/frontend/src/components/TechStock.jsx
echo resultado: %errorlevel%

echo.
echo [2] Verificando arquivo no servidor...
ssh -o StrictHostKeyChecking=no %SERVER% "grep -n 'Escanear MAC' %APP%/frontend/src/components/TechStock.jsx && echo ARQUIVO_OK || echo ARQUIVO_NAO_ATUALIZADO"

echo.
echo [3] Fazendo build...
ssh -o StrictHostKeyChecking=no %SERVER% "cd %APP%/frontend && npm run build 2>&1 | tail -5"

echo.
echo [4] Reiniciando PM2...
ssh -o StrictHostKeyChecking=no %SERVER% "pm2 restart all && sleep 2 && pm2 list"

echo.
echo === CONCLUIDO ===
pause
