@echo off
echo Baixando pscp...
curl -L -o C:\pscp.exe "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" --silent
echo Enviando arquivo JS novo...
C:\pscp.exe -pw @Rebecca135706 -batch C:\jdbuild\dist\assets\index-CKWzGmi4.js root@72.61.28.164:/var/www/goldfibra/frontend/assets/index-CKWzGmi4.js
echo JS: %errorlevel%
C:\pscp.exe -pw @Rebecca135706 -batch C:\jdbuild\dist\index.html root@72.61.28.164:/var/www/goldfibra/frontend/index.html
echo HTML: %errorlevel%
echo PRONTO
pause
