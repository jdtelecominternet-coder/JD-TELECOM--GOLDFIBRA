@echo off
echo ========================================
echo   JD TELECOM - GOLD FIBRA
echo   Iniciando sistema...
echo ========================================

start "JD TELECOM - Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 4 /nobreak >nul
start "JD TELECOM - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Sistema iniciado!
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Primeiro acesso:
echo   ID: JD000001
echo   Senha: admin123
echo.
