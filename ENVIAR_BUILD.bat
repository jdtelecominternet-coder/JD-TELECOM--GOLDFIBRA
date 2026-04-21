@echo off
echo Enviando arquivos buildados para o servidor...
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\dist\assets\index-CHTv0-Eg.js" root@72.61.28.164:/var/www/goldfibra/frontend/assets/index-CHTv0-Eg.js
echo JS: %errorlevel%
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\dist\index.html" root@72.61.28.164:/var/www/goldfibra/frontend/index.html
echo HTML: %errorlevel%
for %%f in ("C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend\dist\assets\*.css") do (
  scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "%%f" root@72.61.28.164:/var/www/goldfibra/frontend/assets/
  echo CSS %%~nxf: %errorlevel%
)
echo DEPLOY_OK
pause
