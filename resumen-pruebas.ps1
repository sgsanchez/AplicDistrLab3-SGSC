# =====================================================================
#  Ejecuta los casos de prueba y muestra un resumen compacto (evidencia)
# =====================================================================
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$resultados = @()

function Invoke-Api {
    param($Metodo, $Ruta, $Cuerpo, $Token)
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $parametros = @{ Uri = "$base$Ruta"; Method = $Metodo; Headers = $headers; ContentType = 'application/json' }
    if ($Cuerpo) { $parametros['Body'] = ($Cuerpo | ConvertTo-Json -Depth 5) }
    try {
        $r = Invoke-WebRequest @parametros -UseBasicParsing
        return @{ codigo = [int]$r.StatusCode; datos = ($r.Content | ConvertFrom-Json) }
    }
    catch {
        $resp = $_.Exception.Response
        $lector = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $texto = $lector.ReadToEnd()
        try { $datos = $texto | ConvertFrom-Json } catch { $datos = @{ mensaje = $texto } }
        return @{ codigo = [int]$resp.StatusCode; datos = $datos }
    }
}

function Caso($descripcion, $esperado, $resultado) {
    $ok = ($resultado.codigo -eq $esperado)
    $script:resultados += [pscustomobject]@{ ok = $ok; descripcion = $descripcion; esperado = $esperado; obtenido = $resultado.codigo }
    $estado = if ($ok) { 'OK   ' } else { 'FALLO' }
    $color = if ($ok) { 'Green' } else { 'Red' }
    Write-Host ('  ' + $descripcion.PadRight(44) + ' esperado ' + ([string]$esperado).PadRight(4) + ' obtenido ' + ([string]$resultado.codigo).PadRight(4) + ' ' + $estado) -ForegroundColor $color
}

$stamp = Get-Date -Format 'HHmmss'
$correo = "santiago$stamp@espe.edu.ec"
$correo2 = "companero$stamp@espe.edu.ec"

Write-Host ''
Write-Host '================================================================================' -ForegroundColor Cyan
Write-Host ' PRUEBAS DE LA API REST - PRACTICA N.3 - APLICACIONES DISTRIBUIDAS' -ForegroundColor Cyan
Write-Host (' Servidor: ' + $base + '   |   Fecha: ' + (Get-Date -Format 'dd/MM/yyyy HH:mm')) -ForegroundColor Cyan
Write-Host '================================================================================' -ForegroundColor Cyan
Write-Host ''

$r = Invoke-Api 'POST' '/api/auth/register' @{ nombre = 'Santiago Sanchez'; correo = $correo; password = 'secreto123' }
Caso '1.  Registro de usuario nuevo' 201 $r

$r = Invoke-Api 'POST' '/api/auth/register' @{ nombre = 'Santiago Sanchez'; correo = $correo; password = 'secreto123' }
Caso '2.  Registro con correo duplicado' 409 $r

$r = Invoke-Api 'POST' '/api/auth/login' @{ correo = $correo; password = 'secreto123' }
Caso '3.  Inicio de sesion correcto' 200 $r
$token = $r.datos.token

$r = Invoke-Api 'POST' '/api/auth/login' @{ correo = $correo; password = 'incorrecta' }
Caso '4.  Login con contrasena incorrecta' 401 $r

$r = Invoke-Api 'POST' '/api/auth/recover' @{ correo = $correo }
Caso '5.  ACTIVIDAD 1: recover correo existente' 200 $r

$r = Invoke-Api 'POST' '/api/auth/recover' @{ correo = 'noexiste@espe.edu.ec' }
Caso '6.  ACTIVIDAD 1: recover correo inexistente' 404 $r

$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Sala A-101'; fecha = '2026-11-25'; horaInicio = '08:00'; horaFin = '10:00'; motivo = 'Clase de Aplicaciones Distribuidas' } $token
Caso '7.  Crear reserva con JWT' 201 $r
$idReserva = $r.datos.reserva._id

$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Sala B-202'; fecha = '2026-11-27'; horaInicio = '08:00'; horaFin = '09:00' }
Caso '8.  Crear reserva sin token' 401 $r

$r = Invoke-Api 'POST' '/api/reservas' @{ sala = 'Sala B-202'; fecha = '2026-11-27'; horaInicio = '10:00'; horaFin = '09:00' } $token
Caso '9.  Crear reserva con horas invertidas' 400 $r

$r = Invoke-Api 'GET' '/api/reservas' $null $token
Caso '10. Listar reservas del usuario' 200 $r

$r = Invoke-Api 'PUT' "/api/reservas/$idReserva" @{ sala = 'Sala A-102'; fecha = '2026-11-28'; horaInicio = '11:00'; horaFin = '13:00' } $token
Caso '11. ACTIVIDAD 2: editar reserva propia' 200 $r

$r = Invoke-Api 'POST' '/api/auth/register' @{ nombre = 'Companero'; correo = $correo2; password = 'secreto456' }
$token2 = $r.datos.token
$r = Invoke-Api 'PUT' "/api/reservas/$idReserva" @{ sala = 'Sala Z-999' } $token2
Caso '12. ACTIVIDAD 2: editar reserva ajena' 403 $r

$r = Invoke-Api 'DELETE' "/api/reservas/$idReserva" $null $token
Caso '13. Cancelar reserva propia' 200 $r

$r = Invoke-Api 'GET' '/api/reservas' $null $token
Caso '14. Listado posterior a la cancelacion' 200 $r

$ok = ($resultados | Where-Object { $_.ok }).Count
$total = $resultados.Count
Write-Host ''
Write-Host (' RESULTADO FINAL: ' + $ok + '/' + $total + ' casos exitosos') -ForegroundColor $(if ($ok -eq $total) { 'Green' } else { 'Red' })
Write-Host '================================================================================' -ForegroundColor Cyan
Write-Host ''
