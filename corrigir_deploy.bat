@echo off
echo ==========================================
echo CORRIGINDO ERRO DO MODULO DEPLOY
echo ==========================================
echo.

echo [1] Verificando se o arquivo deploy.js existe no servidor...
ssh root@jdtelecom.online "ls -la /root/JD-TELECOM--GOLDFIBRA/backend/src/routes/deploy.js 2>&1 || echo 'ARQUIVO NAO EXISTE'"

echo.
echo [2] Forcando atualizacao do codigo...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git fetch origin && git reset --hard origin/main && git pull origin main"

echo.
echo [3] Verificando novamente...
ssh root@jdtelecom.online "ls -la /root/JD-TELECOM--GOLDFIBRA/backend/src/routes/deploy.js 2>&1 || echo 'ARQUIVO AINDA NAO EXISTE'"

echo.
echo [4] Reiniciando backend...
ssh root@jdtelecom.online "pm2 restart sysflow-backend"

echo.
echo [5] Verificando status...
ssh root@jdtelecom.online "pm2 status"

echo.
echo ==========================================
echo CORRECAO CONCLUIDA!
echo ==========================================
echo.
pause