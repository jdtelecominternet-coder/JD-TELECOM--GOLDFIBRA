@echo off
echo ==========================================
echo   JD TELECOM - GOLD FIBRA - BANCO DE DADOS
echo ==========================================
echo.
echo Conectando ao servidor...
echo.
echo Comandos uteis dentro do banco:
echo   .tables              = listar todas as tabelas
echo   .headers on          = mostrar cabecalhos
echo   .mode column         = formatar colunas
echo   SELECT * FROM users; = ver todos usuarios
echo   .quit                = sair
echo.
ssh root@72.61.28.164 "sqlite3 /var/www/goldfibra/backend/database.db"
