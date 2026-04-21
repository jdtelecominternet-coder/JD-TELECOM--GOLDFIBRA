@echo off
echo === BACKUP DO BANCO DE DADOS DO SERVIDOR ===
set BACKUP_DIR=C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
set DATAHORA=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%
set DATAHORA=%DATAHORA: =0%
scp -i "%USERPROFILE%\.ssh\id_rsa" -o StrictHostKeyChecking=no root@72.61.28.164:/var/www/goldfibra/database.sqlite3.bin "%BACKUP_DIR%\goldfibra_%DATAHORA%.sqlite3.bin"
echo Backup resultado: %errorlevel%
if %errorlevel%==0 (
  echo === BACKUP SALVO COM SUCESSO em backups\goldfibra_%DATAHORA%.sqlite3.bin ===
) else (
  echo === ERRO NO BACKUP - verifique a conexao ===
)
pause
