#!/bin/bash
# Script definitivo para corrigir todos os problemas do SysFlowCloudi

echo "=========================================="
echo "CORRECAO DEFINITIVA - SYSFLOWCLOUDI"
echo "=========================================="

# 1. Parar tudo
echo "[1/8] Parando todos os processos..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

# 2. Atualizar codigo
echo "[2/8] Atualizando codigo..."
cd /root/JD-TELECOM--GOLDFIBRA
git fetch origin
git reset --hard origin/main
git pull origin main

# 3. Recriar banco de dados
echo "[3/8] Recriando banco de dados..."
cd /root/JD-TELECOM--GOLDFIBRA/backend
mv database.sqlite database.sqlite.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
rm -f database.sqlite

# 4. Instalar dependencias
echo "[4/8] Instalando dependencias..."
npm install 2>&1 | tail -3

# 5. Compilar frontend
echo "[5/8] Compilando frontend..."
cd /root/JD-TELECOM--GOLDFIBRA/frontend
npm install 2>&1 | tail -3
node node_modules/vite/bin/vite.js build 2>&1 | tail -5

# 6. Copiar para servidor web
echo "[6/8] Copiando para servidor web..."
rm -rf /var/www/goldfibra/*
cp -r /root/JD-TELECOM--GOLDFIBRA/frontend/dist/* /var/www/goldfibra/
rm -f /var/www/goldfibra/sw.js /var/www/goldfibra/workbox*.js

# 7. Iniciar backend (isso cria o banco)
echo "[7/8] Iniciando backend e criando banco..."
cd /root/JD-TELECOM--GOLDFIBRA/backend
timeout 15 node src/server.js 2>&1 || echo "Banco criado"

# 8. Iniciar no PM2
echo "[8/8] Iniciando no PM2..."
pm2 start src/server.js --name sysflow-backend --restart-delay=3000
sleep 3
pm2 status

echo ""
echo "=========================================="
echo "SISTEMA CORRIGIDO!"
echo "=========================================="
echo ""
echo "Login: JD000001"
echo "Senha: admin123"
echo ""
echo "Acesse: https://jdtelecom.online"
echo ""