@echo off
echo ==========================================
echo VERIFICANDO ERRO 500 NO BACKEND
echo ==========================================
echo.

echo [1] Verificando logs do backend...
ssh root@jdtelecom.online "pm2 logs sysflow-backend --lines 30 --nostream 2>&1"

echo.
echo [2] Verificando se o arquivo financial.js existe...
ssh root@jdtelecom.online "ls -la /root/JD-TELECOM--GOLDFIBRA/backend/src/routes/financial.js"

echo.
echo [3] Testando se o backend responde...
ssh root@jdtelecom.online "curl -s http://localhost:3001/api/health 2>&1 || echo 'Backend nao responde'"

echo.
echo [4] Verificando erros no server.js...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && node -c src/server.js 2>&1 || echo 'Erro de sintaxe no server.js'"

echo.
echo [5] Verificando erros no financial.js...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && node -c src/routes/financial.js 2>&1 || echo 'Erro de sintaxe no financial.js'"

echo.
echo ==========================================
echo Se encontrou erros, execute a correcao:
echo ==========================================
echo.

set /p corrigir="Deseja corrigir os erros? (s/n): "

if /i "%corrigir%"=="s" (
    echo.
    echo [CORRECAO] Parando backend...
    ssh root@jdtelecom.online "pm2 stop sysflow-backend"
    
    echo.
    echo [CORRECAO] Verificando e corrigindo arquivo financial.js...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend/src/routes && ls -la financial.js"
    
    echo.
    echo [CORRECAO] Se o arquivo nao existir, recriando...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git checkout origin/main -- backend/src/routes/financial.js 2>&1 || echo 'Arquivo nao existe no git'"
    
    echo.
    echo [CORRECAO] Iniciando backend com logs...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && pm2 start src/server.js --name sysflow-backend --restart-delay=3000 --log /var/log/sysflow-error.log"
    
    echo.
    echo [CORRECAO] Aguardando 5 segundos...
    timeout /t 5 /nobreak > nul
    
    echo.
    echo [CORRECAO] Verificando status...
    ssh root@jdtelecom.online "pm2 status sysflow-backend"
    
    echo.
    echo ==========================================
    echo CORRECAO CONCLUIDA!
    echo ==========================================
)

pause