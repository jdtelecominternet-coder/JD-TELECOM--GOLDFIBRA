@echo off
set SSH=ssh -o StrictHostKeyChecking=no root@72.61.28.164

echo === STATUS PM2 ===
%SSH% "pm2 list"

echo.
echo === ARQUIVOS ENVIADOS ===
%SSH% "ls -la /var/www/goldfibra/backend/src/routes/stock.js /var/www/goldfibra/backend/src/routes/qualityControl.js /var/www/goldfibra/frontend/src/components/TechStock.jsx 2>&1"

echo.
echo === TESTE API ===
%SSH% "curl -s -o /dev/null -w 'HTTP STATUS: %%{http_code}' http://localhost:3001/api/quality-control -H 'Authorization: Bearer teste'"

echo.
echo === BACKUP DO BANCO ===
%SSH% "ls -lh /var/www/goldfibra/database.sqlite3.bin* 2>&1"

echo.
pause
