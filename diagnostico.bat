@echo off
echo ==========================================
echo DIAGNOSTICO E CORRECAO - SYSFLOWCLOUDI
echo ==========================================
echo.

echo [1] Verificando status do backend...
ssh root@jdtelecom.online "pm2 status"

echo.
echo [2] Verificando logs do backend (ultimas 20 linhas)...
ssh root@jdtelecom.online "pm2 logs sysflow-backend --lines 20 --nostream"

echo.
echo [3] Verificando se as tabelas financeiras existem...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite '.tables' | grep -E 'invoices|expenses|financial'"

echo.
echo [4] Verificando arquivos do frontend...
ssh root@jdtelecom.online "ls -la /var/www/goldfibra/assets/ | grep index"

echo.
echo [5] Verificando ultimo commit no servidor...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git log --oneline -1"

echo.
echo ==========================================
echo Se houver erros acima, execute a correcao:
echo ==========================================
echo.

set /p continuar="Deseja executar a CORRECAO completa? (s/n): "

if /i "%continuar%"=="s" (
    echo.
    echo [CORRECAO] Parando backend...
    ssh root@jdtelecom.online "pm2 stop sysflow-backend"
    
    echo.
    echo [CORRECAO] Atualizando codigo...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git fetch origin && git reset --hard origin/main"
    
    echo.
    echo [CORRECAO] Reinstalando dependencias...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && rm -rf node_modules && npm install"
    
    echo.
    echo [CORRECAO] Compilando frontend...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/frontend && rm -rf node_modules dist && npm install && node node_modules/vite/bin/vite.js build"
    
    echo.
    echo [CORRECAO] Copiando para servidor web...
    ssh root@jdtelecom.online "rm -rf /var/www/goldfibra/* && cp -r /root/JD-TELECOM--GOLDFIBRA/frontend/dist/* /var/www/goldfibra/"
    
    echo.
    echo [CORRECAO] Iniciando backend...
    ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && pm2 start src/server.js --name sysflow-backend --restart-delay=3000"
    
    echo.
    echo ==========================================
    echo CORRECAO CONCLUIDA!
    echo ==========================================
) else (
    echo.
    echo Diagnostico concluido. Nenhuma correcao aplicada.
)

pause