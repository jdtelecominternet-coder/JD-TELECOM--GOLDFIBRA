@echo off
echo ==========================================
echo DEPLOY SYSFLOWCLOUDI
echo ==========================================
echo.
echo Conectando ao servidor...
echo.

REM Criar arquivo de comandos temporario
echo cd /root/JD-TELECOM--GOLDFIBRA > deploy_commands.txt
echo git fetch origin >> deploy_commands.txt
echo git reset --hard origin/main >> deploy_commands.txt
echo cd frontend >> deploy_commands.txt
echo node node_modules/vite/bin/vite.js build >> deploy_commands.txt
echo cp -r dist/* /var/www/goldfibra/ >> deploy_commands.txt
echo echo 'DEPLOY CONCLUIDO!' >> deploy_commands.txt

REM Executar comandos no servidor
ssh root@jdtelecom.online < deploy_commands.txt

echo.
echo ==========================================
echo DEPLOY FINALIZADO!
echo ==========================================
pause