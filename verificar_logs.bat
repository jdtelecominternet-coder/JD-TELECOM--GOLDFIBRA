@echo off
echo ==========================================
echo VERIFICANDO LOGS DO BACKEND
echo ==========================================
echo.

echo [1] Verificando logs de erro do PM2...
ssh root@jdtelecom.online "cat /root/.pm2/logs/sysflow-backend-error.log 2>&1 | tail -50 || echo 'Log nao encontrado'"

echo.
echo [2] Verificando logs de saida do PM2...
ssh root@jdtelecom.online "cat /root/.pm2/logs/sysflow-backend-out.log 2>&1 | tail -30 || echo 'Log nao encontrado'"

echo.
echo [3] Testando backend diretamente...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && timeout 5 node src/server.js 2>&1 || echo 'Backend crashou'"

echo.
echo [4] Verificando status do PM2...
ssh root@jdtelecom.online "pm2 status"

echo.
echo ==========================================
echo.
pause