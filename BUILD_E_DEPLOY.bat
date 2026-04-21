@echo off
echo === INSTALANDO DEPENDENCIAS ===
cd /d "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\frontend"
call npm install terser --save-dev --silent
echo.
echo === BUILD COMPATIVEL COM TODOS OS DISPOSITIVOS ===
call npm run build
echo Build: %errorlevel%
if %errorlevel% neq 0 (echo ERRO NO BUILD & pause & exit)

echo.
echo === ENVIANDO PARA O SERVIDOR ===
for %%f in (dist\assets\*.js) do (
  scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "%%f" root@72.61.28.164:/var/www/goldfibra/frontend/assets/
  echo JS %%~nxf: %errorlevel%
)
for %%f in (dist\assets\*.css) do (
  scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no "%%f" root@72.61.28.164:/var/www/goldfibra/frontend/assets/
  echo CSS %%~nxf: %errorlevel%
)
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no dist\index.html root@72.61.28.164:/var/www/goldfibra/frontend/index.html
echo index.html: %errorlevel%
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no dist\manifest.webmanifest root@72.61.28.164:/var/www/goldfibra/frontend/manifest.webmanifest
echo manifest: %errorlevel%
echo.
echo === DEPLOY CONCLUIDO ===
pause
