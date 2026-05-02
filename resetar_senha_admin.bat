@echo off
echo ==========================================
echo RESETANDO SENHA DO ADMIN
echo ==========================================
echo.

echo [1] Verificando usuario...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite 'SELECT id, jd_id, name FROM users;'"

echo.
echo [2] Resetando senha para admin123...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite \"UPDATE passwords SET hash = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE user_id = 1;\""

echo.
echo [3] Verificando se a senha foi atualizada...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite 'SELECT u.jd_id, u.name, p.hash FROM users u JOIN passwords p ON u.id = p.user_id;'"

echo.
echo [4] Reiniciando backend...
ssh root@jdtelecom.online "pm2 restart sysflow-backend"

echo.
echo ==========================================
echo SENHA RESETADA COM SUCESSO!
echo ==========================================
echo.
echo Login: ID000001
echo Senha: admin123
echo.
pause