# =====================================================================
#  Inicia el entorno completo del laboratorio:
#    1) MongoDB portable (si no esta corriendo)
#    2) Servidor API (node server.js) en una ventana nueva
#  Uso:  clic derecho > Ejecutar con PowerShell
# =====================================================================
$ErrorActionPreference = 'Stop'
$raizProyecto = $PSScriptRoot
$mongod = Join-Path $env:USERPROFILE 'mongodb\mongodb-win32-x86_64-windows-8.0.38\bin\mongod.exe'
$datos = Join-Path $env:USERPROFILE 'mongodb-data'

if (-not (Test-Path $mongod)) {
    Write-Host "No se encontro mongod.exe en: $mongod" -ForegroundColor Red
    Write-Host "Descargue MongoDB portable o ajuste la ruta en este script." -ForegroundColor Yellow
    exit 1
}

New-Item -ItemType Directory -Force -Path $datos | Out-Null

$escuchando = Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($escuchando) {
    Write-Host "[MongoDB] ya esta en ejecucion en 127.0.0.1:27017" -ForegroundColor Green
}
else {
    Write-Host "[MongoDB] iniciando con dbpath $datos ..." -ForegroundColor Cyan
    Start-Process -FilePath $mongod -ArgumentList "--dbpath", "`"$datos`"", "--port", "27017", "--bind_ip", "127.0.0.1" -WindowStyle Minimized
    $intentos = 0
    while (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
        Start-Sleep -Milliseconds 500
        $intentos++
        if ($intentos -ge 40) { Write-Host "[MongoDB] no respondio en 20 s" -ForegroundColor Red; exit 1 }
    }
    Write-Host "[MongoDB] listo" -ForegroundColor Green
}

Write-Host "[API] iniciando servidor en una ventana nueva..." -ForegroundColor Cyan
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', "Set-Location '$raizProyecto'; node server.js"
Start-Sleep -Seconds 2
Start-Process 'http://localhost:3000/'
Write-Host "Entorno listo. Servidor en http://localhost:3000" -ForegroundColor Green
