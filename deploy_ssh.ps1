# Deploy automatico para o VPS
$SERVER = "root@72.61.28.164"
$PASS   = "@Suremi135706"
$APP    = "/var/www/goldfibra"

# Funcao para executar comando SSH com senha via stdin pipe
function SSH-Cmd($cmd) {
    $proc = Start-Process -FilePath "ssh" `
        -ArgumentList "-o StrictHostKeyChecking=no -o NumberOfPasswordPrompts=1 $SERVER `"$cmd`"" `
        -PassThru -NoNewWindow -Wait
    return $proc.ExitCode
}

Write-Host "=== Deploy JD TELECOM - GOLD FIBRA ===" -ForegroundColor Cyan
Write-Host "Servidor: $SERVER"
Write-Host "Diretorio: $APP"
Write-Host ""

# Arquivos a enviar
$files = @(
    @{ local = "backend\src\database.js";                    remote = "$APP/backend/src/database.js" },
    @{ local = "backend\src\routes\stock.js";                remote = "$APP/backend/src/routes/stock.js" },
    @{ local = "backend\src\server.js";                      remote = "$APP/backend/src/server.js" },
    @{ local = "frontend\src\pages\TechnicalOrders.jsx";     remote = "$APP/frontend/src/pages/TechnicalOrders.jsx" },
    @{ local = "frontend\src\components\TechStock.jsx";      remote = "$APP/frontend/src/components/TechStock.jsx" },
    @{ local = "frontend\src\pages\Users.jsx";               remote = "$APP/frontend/src/pages/Users.jsx" }
)

Write-Host "Enviando arquivos via SCP..." -ForegroundColor Yellow

$base = "C:\Users\User\Downloads\remix_-jd-telecom---gold-fibra (3)"

foreach ($f in $files) {
    $localPath = Join-Path $base $f.local
    Write-Host "  -> $($f.local)" -ForegroundColor Gray
    $proc = Start-Process -FilePath "scp" `
        -ArgumentList "-o StrictHostKeyChecking=no `"$localPath`" ${SERVER}:$($f.remote)" `
        -PassThru -NoNewWindow -Wait
    if ($proc.ExitCode -ne 0) {
        Write-Host "  ERRO ao enviar $($f.local)" -ForegroundColor Red
    } else {
        Write-Host "  OK" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Pronto! Agora faca o build e restart manualmente no servidor." -ForegroundColor Cyan
Write-Host "Conecte via SSH e execute:"
Write-Host "  cd /var/www/goldfibra/frontend && npm run build"
Write-Host "  pm2 restart all"
