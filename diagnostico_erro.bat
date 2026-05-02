@echo off
echo ==========================================
echo DIAGNOSTICO DO ERRO 500
echo ==========================================
echo.

echo [1] Verificando erro exato do backend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && node src/server.js 2>&1 &"

timeout /t 3 /nobreak > nul

echo.
echo [2] Verificando logs de erro...
ssh root@jdtelecom.online "cat /root/.pm2/logs/sysflow-backend-error.log 2>&1 | tail -30 || echo 'Log nao encontrado'"

echo.
echo [3] Verificando se o modulo financial.js existe...
ssh root@jdtelecom.online "ls -la /root/JD-TELECOM--GOLDFIBRA/backend/src/routes/ | grep financial"

echo.
echo [4] Verificando sintaxe do server.js...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && node --check src/server.js 2>&1 || echo 'ERRO DE SINTAXE NO SERVER.JS'"

echo.
echo [5] Verificando sintaxe do financial.js...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && node --check src/routes/financial.js 2>&1 || echo 'ERRO DE SINTAXE NO FINANCIAL.JS'"

echo.
echo ==========================================
echo.
pause