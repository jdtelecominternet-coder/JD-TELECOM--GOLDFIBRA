@echo off
echo Enviando settings.js...
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no C:\tmp_deploy\settings.js root@72.61.28.164:/var/www/goldfibra/backend/src/routes/settings.js
echo settings.js: %errorlevel%
echo Reiniciando backend...
ssh -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no root@72.61.28.164 "pm2 restart all && echo PRONTO"
pause
