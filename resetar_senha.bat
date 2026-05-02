@echo off
echo ==========================================
echo RESETANDO SENHA DO ADMINISTRADOR
echo ==========================================
echo.

echo [1] Verificando usuario admin no banco...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite 'SELECT id, jd_id, name, role FROM users WHERE jd_id=\"JD000001\";'"

echo.
echo [2] Resetando senha para 'admin123'...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && node -e \"const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync('admin123', 10); console.log('Hash gerado:', hash);\""

echo.
echo [3] Atualizando senha no banco...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite \"UPDATE passwords SET hash = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE user_id = (SELECT id FROM users WHERE jd_id = 'JD000001');\""

echo.
echo [4] Verificando se a senha foi atualizada...
ssh root@jdtelecom.online "cd /root/JD-TELECOM--GOLDFIBRA/backend && sqlite3 database.sqlite 'SELECT u.jd_id, u.name, p.hash FROM users u JOIN passwords p ON u.id = p.user_id WHERE u.jd_id=\"JD000001\";'"

echo.
echo ==========================================
echo SENHA RESETADA!
echo ==========================================
echo.
echo Login: JD000001
echo Senha: admin123
echo.
pause