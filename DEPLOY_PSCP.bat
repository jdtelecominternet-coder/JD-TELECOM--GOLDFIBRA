@echo off
echo Instalando sshpass equivalente...
where plink >nul 2>&1
if %errorlevel%==0 (
  echo Usando plink...
  plink -ssh -pw @Rebecca135706 -batch root@72.61.28.164 "cat > /var/www/goldfibra/frontend/assets/index-CKWzGmi4.js" < C:\jdbuild\dist\assets\index-CKWzGmi4.js
  echo resultado: %errorlevel%
) else (
  echo plink nao encontrado. Tentando pscp...
  where pscp >nul 2>&1
  if %errorlevel%==0 (
    pscp -pw @Rebecca135706 -batch C:\jdbuild\dist\assets\index-CKWzGmi4.js root@72.61.28.164:/var/www/goldfibra/frontend/assets/index-CKWzGmi4.js
    echo resultado: %errorlevel%
  ) else (
    echo PuTTY nao instalado. Baixando pscp...
    curl -L -o C:\tmp_deploy\pscp.exe https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe
    C:\tmp_deploy\pscp.exe -pw @Rebecca135706 -batch C:\jdbuild\dist\assets\index-CKWzGmi4.js root@72.61.28.164:/var/www/goldfibra/frontend/assets/index-CKWzGmi4.js
    echo resultado: %errorlevel%
  )
)
pause
