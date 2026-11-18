# =====================================================================
#  Script de pruebas de la API REST de Reservas de Salas
#  Practica N. 3 - Aplicaciones Distribuidas - ESPE
#  Uso:  powershell -ExecutionPolicy Bypass -File .\pruebas.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

function Titulo($texto) {
    Write-Host ""
    Write-Host ("=" * 78) -ForegroundColor DarkGray
    Write-Host " $texto" -ForegroundColor Cyan
    Write-Host ("=" * 78) -ForegroundColor DarkGray
}

function Mostrar($respuesta, $codigo) {
    Write-Host "HTTP $codigo" -ForegroundColor Yellow
    $respuesta | ConvertTo-Json -Depth 6
}

function Invoke-Api {
    param($Metodo, $Ruta, $Cuerpo, $Token)
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $parametros = @{
        Uri         = "$base$Ruta"
        Method      = $Metodo
        Headers     = $headers
        ContentType = 'application/json'
    }
    if ($Cuerpo) { $parametros['Body'] = ($Cuerpo | ConvertTo-Json -Depth 5) }
    try {
        $r = Invoke-WebRequest @parametros -UseBasicParsing
        return @{ codigo = [int]$r.StatusCode; datos = ($r.Content | ConvertFrom-Json) }
    }
    catch {
        $resp = $_.Exception.Response
        $codigo = [int]$resp.StatusCode
        $lector = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $texto = $lector.ReadToEnd()
        return @{ codigo = $codigo; datos = ($texto | ConvertFrom-Json) }
    }
}

$stamp = Get-Date -Format 'HHmmss'
$correo = "santiago$stamp@espe.edu.ec"
$correo2 = "compañero$stamp@espe.edu.ec"

# ---------------------------------------------------------------------
Titulo "1) POST /api/auth/register  -  Registro de usuario"
$r = Invoke-Api 'POST' '/api/auth/register' @{ nombre = 'Santiago Sanchez'; correo = $correo; password = 'secreto123' }
Mostrar $r.datos $r.codigo

Titulo "1b) Registro duplicado (debe responder 409)"
$r = Invoke-Api 'POST' '/api/auth/register' @{ nombre = 'Santiago Sanchez'; correo = $correo; password = 'secreto123' }
Mostrar $r.datos $r.codigo

# ---------------------------------------------------------------------
Titulo "2) POST /api/auth/login  -  Inicio de sesion"
$r = Invoke-Api 'POST' '/api/auth/login' @{ correo = $correo; password = 'secreto123' }
Mostrar $r.datos $r.codigo
$token = $r.datos.token

Titulo "2b) Login con contrasena incorrecta (debe responder 401)"
$r = Invoke-Api 'POST' '/api/auth/login' @{ correo = $correo; password = 'incorrecta' }
Mostrar $r.datos $r.codigo

# ---------------------------------------------------------------------
Titulo "3) ACTIVIDAD 1 - POST /api/auth/recover  -  Correo existente"
$r = Invoke-Api 'POST' '/api/auth/recover' @{ correo = $correo }
Mostrar $r.datos $r.codigo

Titulo "3b) ACTIVIDAD 1 - POST /api/auth/recover  -  Correo inexistente (debe responder 404)"
$r = Invoke-Api 'POST' '/api/auth/recover' @{ correo = 'noexiste@espe.edu.ec' }
Mostrar $r.datos $r.codigo

# ---------------------------------------------------------------------
Titulo "4) POST /api/reservas  -  Crear reserva (con JWT)"
$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Sala A-101'; fecha = '2026-11-25'; horaInicio = '08:00'; horaFin = '10:00'; motivo = 'Clase de Aplicaciones Distribuidas' } $token
Mostrar $r.datos $r.codigo
$idReserva = $r.datos.reserva._id

Titulo "4b) Crear una segunda reserva"
$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Laboratorio de Redes'; fecha = '2026-11-26'; horaInicio = '14:00'; horaFin = '16:00'; motivo = 'Practica de redes' } $token
Mostrar $r.datos $r.codigo

Titulo "4c) Crear reserva sin JWT (debe responder 401)"
$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Sala B-202'; fecha = '2026-11-27'; horaInicio = '08:00'; horaFin = '09:00' }
Mostrar $r.datos $r.codigo

Titulo "4d) Crear reserva con hora fin menor a la de inicio (debe responder 400)"
$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Sala B-202'; fecha = '2026-11-27'; horaInicio = '10:00'; horaFin = '09:00' } $token
Mostrar $r.datos $r.codigo

# ---------------------------------------------------------------------
Titulo "5) GET /api/reservas  -  Obtener reservas del usuario"
$r = Invoke-Api 'GET' '/api/reservas' $null $token
Mostrar $r.datos $r.codigo

# ---------------------------------------------------------------------
Titulo "6) ACTIVIDAD 2 - PUT /api/reservas/:id  -  Editar sala, fecha y hora"
$r = Invoke-Api 'PUT' "/api/reservas/$idReserva" @{ sala = 'Sala A-102'; fecha = '2026-11-28'; horaInicio = '11:00'; horaFin = '13:00'; motivo = 'Cambio de aula solicitado' } $token
Mostrar $r.datos $r.codigo

Titulo "6b) ACTIVIDAD 2 - PUT sobre una reserva de OTRO usuario (debe responder 403)"
$r = Invoke-Api 'POST' '/api/auth/register' @{ nombre = 'Companero'; correo = $correo2; password = 'secreto456' }
$token2 = $r.datos.token
$r = Invoke-Api 'PUT' "/api/reservas/$idReserva" @{ sala = 'Sala Z-999' } $token2
Mostrar $r.datos $r.codigo

# ---------------------------------------------------------------------
Titulo "7) DELETE /api/reservas/:id  -  Cancelar reserva"
$r = Invoke-Api 'DELETE' "/api/reservas/$idReserva" $null $token
Mostrar $r.datos $r.codigo

Titulo "7b) Listado final del usuario"
$r = Invoke-Api 'GET' '/api/reservas' $null $token
Mostrar $r.datos $r.codigo

Write-Host ""
Write-Host "Pruebas finalizadas." -ForegroundColor Green
