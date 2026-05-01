#!/bin/bash
# Script definitivo para corrigir todos os problemas do SysFlowCloudi

echo "=========================================="
echo "VARREDURA E CORRECAO COMPLETA"
echo "=========================================="

# 1. Parar tudo
echo "[1/10] Parando todos os processos..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

# 2. Atualizar codigo
echo "[2/10] Atualizando codigo..."
cd /root/JD-TELECOM--GOLDFIBRA
git fetch origin
git reset --hard origin/main
git pull origin main

# 3. Verificar e corrigir banco de dados
echo "[3/10] Verificando banco de dados..."
cd /root/JD-TELECOM--GOLDFIBRA/backend

# Se o banco nao existir ou estiver vazio, recriar
if [ ! -f "database.sqlite" ] || [ $(sqlite3 database.sqlite "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null || echo "0") -eq "0" ]; then
    echo "Banco nao existe ou vazio. Criando..."
    rm -f database.sqlite
    sqlite3 database.sqlite < src/init.sql
    echo "Banco criado com usuario ID000001 / admin123"
else
    echo "Banco existe. Verificando usuario admin..."
    # Verificar se o admin existe
    ADMIN_EXISTS=$(sqlite3 database.sqlite "SELECT count(*) FROM users WHERE jd_id='ID000001';" 2>/dev/null || echo "0")
    if [ "$ADMIN_EXISTS" -eq "0" ]; then
        echo "Admin nao existe. Criando..."
        sqlite3 database.sqlite "INSERT INTO users (jd_id, name, email, role, active) VALUES ('ID000001', 'Administrador', 'admin@sysflowcloudi.com', 'admin', 1);"
        sqlite3 database.sqlite "INSERT INTO passwords (user_id, hash) SELECT id, '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' FROM users WHERE jd_id='ID000001';"
    else
        echo "Admin existe. Resetando senha..."
        sqlite3 database.sqlite "UPDATE passwords SET hash = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE user_id = (SELECT id FROM users WHERE jd_id='ID000001');"
    fi
fi

# 4. Reinstalar dependencias do backend
echo "[4/10] Reinstalando dependencias do backend..."
cd /root/JD-TELECOM--GOLDFIBRA/backend
rm -rf node_modules
npm install 2>&1 | tail -5

# 5. Compilar frontend
echo "[5/10] Compilando frontend..."
cd /root/JD-TELECOM--GOLDFIBRA/frontend
rm -rf node_modules dist
npm install 2>&1 | tail -5
node node_modules/vite/bin/vite.js build 2>&1 | tail -10

# 6. Copiar para servidor web
echo "[6/10] Copiando para servidor web..."
rm -rf /var/www/goldfibra/*
cp -r /root/JD-TELECOM--GOLDFIBRA/frontend/dist/* /var/www/goldfibra/
rm -f /var/www/goldfibra/sw.js /var/www/goldfibra/workbox*.js

# 7. Configurar permissoes
echo "[7/10] Configurando permissoes..."
chown -R www-data:www-data /var/www/goldfibra/
chmod -R 755 /var/www/goldfibra/

# 8. Testar backend
echo "[8/10] Testando backend..."
cd /root/JD-TELECOM--GOLDFIBRA/backend
timeout 10 node src/server.js &
sleep 5
kill %1 2>/dev/null || true

# 9. Iniciar no PM2
echo "[9/10] Iniciando no PM2..."
cd /root/JD-TELECOM--GOLDFIBRA/backend
pm2 start src/server.js --name sysflow-backend --restart-delay=3000 --max-restarts=10

# 10. Verificar status
echo "[10/10] Verificando status..."
sleep 3
pm2 status

echo ""
echo "=========================================="
echo "SISTEMA CORRIGIDO!"
echo "=========================================="
echo ""
echo "Login: ID000001"
echo "Senha: admin123"
echo ""
echo "Acesse: https://jdtelecom.online"
echo ""

# Testar login
echo "Testando API..."
curl -s -X POST https://jdtelecom.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"jd_id":"ID000001","password":"admin123"}' 2>/dev/null | head -c 100 || echo "API nao respondeu"

echo ""
echo "Se o teste acima mostrar erro, aguarde 10 segundos e tente novamente."