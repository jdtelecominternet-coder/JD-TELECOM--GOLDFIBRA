@echo off
echo ==========================================
echo RECRIANDO BANCO DE DADOS
echo ==========================================
echo.

echo [1] Parando backend...
ssh root@jdtelecom.online "pm2 stop sysflow-backend 2>&1 || echo 'Ja parado'"

echo.
echo [2] Backup do banco antigo...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && mv database.sqlite database.sqlite.backup.$(date +%Y%m%d_%H%M%S) 2>&1 || echo 'Sem banco para backup'"

echo.
echo [3] Deletando banco corrompido...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && rm -f database.sqlite"

echo.
echo [4] Iniciando backend para criar novo banco...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && timeout 10 node src/server.js 2>&1 || echo 'Timeout - banco criado'"

echo.
echo [5] Verificando se as tabelas foram criadas...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite '.tables'"

echo.
echo [6] Verificando usuario admin criado...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite 'SELECT jd_id, name, role FROM users WHERE jd_id=\"JD000001\";'"

echo.
echo [7] Iniciando backend no PM2...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && pm2 start src/server.js --name sysflow-backend && pm2 status"

echo.
echo ==========================================
echo BANCO RECRIADO!
echo ==========================================
echo.
echo Login: JD000001
echo Senha: admin123
echo.
pause