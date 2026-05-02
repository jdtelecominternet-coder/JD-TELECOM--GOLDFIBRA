@echo off
echo ==========================================
echo CORRIGINDO BACKEND - ULTIMA TENTATIVA
echo ==========================================
echo.

echo [1] Parando tudo...
ssh root@jdtelecom.online "pm2 stop all 2>&1; pm2 delete all 2>&1"

echo.
echo [2] Verificando logs de erro...
ssh root@jdtelecom.online "cat /root/.pm2/logs/sysflow-backend-error.log 2>&1 | tail -30 || echo 'Sem logs'"

echo.
echo [3] Verificando se o deploy.js existe...
ssh root@jdtelecom.online "ls -la /root/JD-TELECOM--GOLDFIBRA/backend/src/routes/deploy.js 2>&1 || echo 'ARQUIVO NAO EXISTE - VAI DAR ERRO'"

echo.
echo [4] Verificando banco de dados...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite '.tables' 2>&1 || echo 'BANCO VAZIO OU CORROMPIDO'"

echo.
echo [5] Iniciando backend manualmente...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && timeout 15 node src/server.js 2>&1 || echo 'Timeout - verificando se iniciou'"

echo.
echo [6] Iniciando no PM2...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && pm2 start src/server.js --name sysflow-backend --restart-delay=5000 --max-restarts=20"

echo.
echo [7] Aguardando 10 segundos...
timeout /t 10 /nobreak > nul

echo.
echo [8] Verificando status final...
ssh root@jdtelecom.online "pm2 status"

echo.
echo ==========================================
echo.
pause