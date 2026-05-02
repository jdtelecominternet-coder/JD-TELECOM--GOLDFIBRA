@echo off
echo ==========================================
echo VERIFICANDO E REINICIANDO BACKEND
echo ==========================================
echo.

echo [1] Verificando status do backend...
ssh root@jdtelecom.online "pm2 status"

echo.
echo [2] Verificando logs de erro...
ssh root@jdtelecom.online "pm2 logs sysflow-backend --lines 20 --nostream 2>&1 | tail -20"

echo.
echo [3] Reiniciando backend...
ssh root@jdtelecom.online "pm2 restart sysflow-backend 2>&1 || pm2 start /root/JD-TELECOM--GOLDFIBRA/backend/src/server.js --name sysflow-backend"

echo.
echo [4] Aguardando 3 segundos...
timeout /t 3 /nobreak > nul

echo.
echo [5] Verificando status novamente...
ssh root@jdtelecom.online "pm2 status"

echo.
echo ==========================================
echo.
pause