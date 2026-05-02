@echo off
echo ==========================================
echo DEPLOY SISTEMA FINANCEIRO - SYSFLOWCLOUDI
echo ==========================================
echo.

REM Verificar se o repositório está atualizado
echo [1/5] Atualizando codigo no servidor...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git fetch origin && git reset --hard origin/main && echo 'Codigo atualizado'"

if %errorlevel% neq 0 (
    echo ERRO: Falha ao atualizar codigo
    pause
    exit /b 1
)

echo.
echo [2/5] Instalando dependencias do backend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && npm install 2>&1 | tail -3"

echo.
echo [3/5] Compilando frontend...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/frontend && node node_modules/vite/bin/vite.js build 2>&1 | tail -5"

if %errorlevel% neq 0 (
    echo ERRO: Falha ao compilar frontend
    pause
    exit /b 1
)

echo.
echo [4/5] Copiando arquivos para servidor web...
ssh root@jdtelecom.online "cp -r /root/JD-TELECOM--GOLDFIBRA/frontend/dist/* /var/www/goldfibra/ && rm -f /var/www/goldfibra/sw.js /var/www/goldfibra/workbox*.js && echo 'Arquivos copiados'"

echo.
echo [5/5] Reiniciando backend...
ssh root@jdtelecom.online "pm2 restart sysflow-backend 2>&1 || pm2 start /root/JD-TELECOM--GOLDFIBRA/backend/src/server.js --name sysflow-backend"

echo.
echo ==========================================
echo DEPLOY CONCLUIDO!
echo ==========================================
echo.
echo Acesse: https://jdtelecom.online
echo.
pause