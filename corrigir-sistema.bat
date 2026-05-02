@echo off
chcp 65001 >nul
echo ========================================
echo CORRIGINDO SISTEMA SYFLOWCLOUDI
echo ========================================
echo.
echo Conectando ao servidor...
echo.

ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA && git pull && cd backend && node seed-complete.js && pm2 restart sysflow-backend && echo 'Sistema reiniciado com sucesso!'"

echo.
echo ========================================
echo PROCESSO CONCLUIDO!
echo ========================================
echo.
echo Aguarde 10 segundos e acesse:
echo https://jdtelecom.online
echo.
echo Credenciais de teste:
echo   Admin:     000001 / admin123
echo   Vendedor:  000002 / vendedor123
echo   Tecnico:   000003 / tecnico123
echo.
pause
