@echo off
echo ==========================================
echo CORRECAO COMPLETA - SYSFLOWCLOUDI
echo ==========================================
echo.

echo [1/6] Parando tudo...
ssh root@jdtelecom.online "pm2 stop all 2>&1; pm2 delete all 2>&1; echo 'Parado'"

echo.
echo [2/6] Atualizando codigo...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git fetch origin && git reset --hard origin/main && git pull origin main"

echo.
echo [3/6] Compilando frontend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/frontend && npm install 2>&1 && node node_modules/vite/bin/vite.js build 2>&1 | tail -3"

echo.
echo [4/6] Copiando para servidor web...
ssh root@jdtelecom.online "rm -rf /var/www/goldfibra/* && cp -r /root/JD-TELECOM--GOLDFIBRA/frontend/dist/* /var/www/goldfibra/ && rm -f /var/www/goldfibra/sw.js /var/www/goldfibra/workbox*.js"

echo.
echo [5/6] Iniciando backend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && pm2 start src/server.js --name sysflow-backend --restart-delay=3000"

echo.
echo [6/6] Verificando status...
timeout /t 3 /nobreak > nul
ssh root@jdtelecom.online "pm2 status"

echo.
echo ==========================================
echo SISTEMA REINICIADO!
echo ==========================================
echo.
echo Acesse: https://jdtelecom.online
echo.
pause