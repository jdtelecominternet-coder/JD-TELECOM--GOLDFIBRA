@echo off
echo ========================================
echo   JD TELECOM - GOLD FIBRA
echo   Instalando dependencias...
echo ========================================

cd backend
echo [1/2] Instalando backend...
call npm install
if errorlevel 1 (
  echo ERRO ao instalar backend!
  pause
  exit /b 1
)

cd ..\frontend
echo [2/2] Instalando frontend...
call npm install
if errorlevel 1 (
  echo ERRO ao instalar frontend!
  pause
  exit /b 1
)

cd ..
echo.
echo ========================================
echo   Instalacao concluida!
echo   Execute: iniciar.bat
echo ========================================
pause
