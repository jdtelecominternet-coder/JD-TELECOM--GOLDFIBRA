@echo off
title JD TELECOM - GOLD FIBRA
echo ========================================
echo   JD TELECOM - GOLD FIBRA
echo   Iniciando sistema...
echo ========================================
echo.

start "JD TELECOM - Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 4 /nobreak >nul
start "JD TELECOM - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul
start "JD TELECOM - Tunel Internet" cmd /k "ngrok http 5173"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do set IP=%%a & goto :found
:found
set IP=%IP: =%

echo ========================================
echo   SISTEMA INICIADO!
echo ========================================
echo.
echo   [REDE LOCAL / WI-FI]
echo   http://localhost:5173      (este computador)
echo   http://%IP%:5173   (outros no Wi-Fi)
echo.
echo   [INTERNET / DADOS MOVEIS]
echo   Veja a janela "JD TELECOM - Tunel Internet"
echo   e copie o link https://xxxx.ngrok-free.app
echo.
echo   IMPORTANTE: Na primeira vez, acesse
echo   https://ngrok.com e crie conta gratuita,
echo   depois execute:
echo   ngrok config add-authtoken SEU_TOKEN
echo.
echo   Login padrao:
echo   ID: JD000001  /  Senha: admin123
echo ========================================
echo.
pause