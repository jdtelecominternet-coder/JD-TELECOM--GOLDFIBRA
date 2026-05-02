@echo off
echo ==========================================
echo REINICIANDO BACKEND E VERIFICANDO LOGS
echo ==========================================
echo.

echo [1] Parando backend...
ssh root@jdtelecom.online "pm2 stop sysflow-backend 2>&1 || echo 'Ja parado'"

echo.
echo [2] Deletando backend do PM2...
ssh root@jdtelecom.online "pm2 delete sysflow-backend 2>&1 || echo 'Nao existe'"

echo.
echo [3] Limpando logs...
ssh root@jdtelecom.online "pm2 flush sysflow-backend 2>&1 || echo 'Sem logs'"

echo.
echo [4] Iniciando backend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && pm2 start src/server.js --name sysflow-backend --restart-delay=3000"

echo.
echo [5] Aguardando 5 segundos...
timeout /t 5 /nobreak > nul

echo.
echo [6] Verificando status...
ssh root@jdtelecom.online "pm2 status"

echo.
echo [7] Verificando logs de erro (ultimas 20 linhas)...
ssh root@jdtelecom.online "pm2 logs sysflow-backend --lines 20 --nostream 2>&1 || echo 'Sem logs'"

echo.
echo ==========================================
echo.
pause