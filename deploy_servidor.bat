@echo off
echo ==========================================
echo DEPLOY COMPLETO NO SERVIDOR
echo ==========================================
echo.

echo [1/5] Atualizando codigo...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git pull origin main"

echo.
echo [2/5] Instalando dependencias do frontend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/frontend && npm install 2>&1 | tail -3"

echo.
echo [3/5] Compilando frontend no servidor...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/frontend && node node_modules/vite/bin/vite.js build 2>&1 | tail -5"

echo.
echo [4/5] Copiando para servidor web...
ssh root@jdtelecom.online "cp -r /root/JD-TELECOM--GOLDFIBRA/frontend/dist/* /var/www/goldfibra/ && rm -f /var/www/goldfibra/sw.js /var/www/goldfibra/workbox*.js"

echo.
echo [5/5] Reiniciando backend...
ssh root@jdtelecom.online "pm2 restart sysflow-backend"

echo.
echo ==========================================
echo DEPLOY CONCLUIDO!
echo ==========================================
echo.
echo Acesse: https://jdtelecom.online/financial
echo.
pause