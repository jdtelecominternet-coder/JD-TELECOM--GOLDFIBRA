#!/bin/bash
# ================================================
# JD TELECOM - GOLD FIBRA
# Script de instalacao automatica no VPS Ubuntu
# ================================================

set -e
DOMAIN=$1
APP_DIR="/var/www/goldfibra"

echo "========================================"
echo "  JD TELECOM - GOLD FIBRA"
echo "  Instalando no servidor..."
echo "========================================"

# 1. Atualizar sistema
apt update -y && apt upgrade -y

# 2. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Instalar nginx, certbot, pm2, git
apt install -y nginx certbot python3-certbot-nginx
npm install -g pm2

# 4. Criar pasta do app
mkdir -p $APP_DIR
cd $APP_DIR

# 5. Copiar arquivos (sera feito via scp antes)
echo "Aguardando arquivos do sistema em $APP_DIR..."

# 6. Instalar dependencias backend
cd $APP_DIR/backend
npm install --production

# 7. Instalar dependencias e buildar frontend
cd $APP_DIR/frontend
npm install
npm run build

# 8. Configurar nginx
cat > /etc/nginx/sites-available/goldfibra << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend (arquivos estaticos)
    location / {
        root $APP_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/goldfibra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 9. SSL gratuito com Certbot
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

# 10. Iniciar backend com PM2
cd $APP_DIR/backend
pm2 start src/server.js --name "goldfibra-backend"
pm2 save
pm2 startup

echo "========================================"
echo "  INSTALACAO CONCLUIDA!"
echo "  Acesse: https://$DOMAIN"
echo "========================================"