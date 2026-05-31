# Setup Evolution API local para URBA
# Uso: .\setup.ps1
# Requiere: Docker Desktop, PowerShell 5+

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

if (-not (Test-Path "$Root\.env")) {
  Copy-Item "$Root\.env.example" "$Root\.env"
  Write-Host "Creado .env desde .env.example"
}

function Get-EnvValue($name) {
  $line = Get-Content "$Root\.env" | Where-Object { $_ -match "^\s*$name=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -split "=", 2)[1].Trim().Trim('"')
}

$apiKey = Get-EnvValue "AUTHENTICATION_API_KEY"
$instance = Get-EnvValue "EVOLUTION_INSTANCE"
$webhookUrl = Get-EnvValue "URBA_WEBHOOK_URL"
if (-not $instance) { $instance = "urba" }
if (-not $apiKey) { $apiKey = "urba-local-secret" }
if (-not $webhookUrl) { $webhookUrl = "http://host.docker.internal:8787/api/whatsapp/webhook" }

Write-Host "Levantando Evolution (postgres + redis + api)..."
Push-Location $Root
docker compose up -d
Pop-Location

Write-Host "Esperando Evolution en http://localhost:8080 ..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $null = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 3
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $ready) {
  Write-Error "Evolution no respondio en 2 minutos. Revisa: docker compose logs evolution-api"
}

$headers = @{
  apikey       = $apiKey
  "Content-Type" = "application/json"
}

Write-Host "Creando instancia '$instance' (si no existe)..."
$createBody = @{
  instanceName = $instance
  integration  = "WHATSAPP-BAILEYS"
  qrcode       = $true
} | ConvertTo-Json

try {
  Invoke-RestMethod -Uri "http://localhost:8080/instance/create" -Method POST -Headers $headers -Body $createBody | Out-Null
  Write-Host "Instancia creada."
} catch {
  Write-Host "Instancia ya existe o create devolvio: $($_.Exception.Message)"
}

Write-Host "Configurando webhook -> $webhookUrl"
$webhookBody = @{
  webhook = @{
    enabled        = $true
    url            = $webhookUrl
    webhookByEvents = $false
    events         = @("MESSAGES_UPSERT")
  }
} | ConvertTo-Json -Depth 5

try {
  Invoke-RestMethod -Uri "http://localhost:8080/webhook/set/$instance" -Method POST -Headers $headers -Body $webhookBody | Out-Null
  Write-Host "Webhook configurado."
} catch {
  Write-Warning "No se pudo setear webhook: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== QR CODE ==="
Write-Host "Opcion A: abri http://localhost:8080/manager (si esta disponible en tu imagen)"
Write-Host "Opcion B: GET http://localhost:8080/instance/connect/$instance con header apikey"
Write-Host ""

try {
  $connect = Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/$instance" -Method GET -Headers @{ apikey = $apiKey }
  if ($connect.base64) {
    Write-Host "QR base64 recibido (pega en un visor base64 o usa el manager)."
  } elseif ($connect.qrcode) {
    Write-Host $connect.qrcode
  } else {
    Write-Host ($connect | ConvertTo-Json -Depth 4)
  }
} catch {
  Write-Host "Pedí el QR manualmente cuando la instancia este lista."
}

Write-Host ""
Write-Host "=== URBA server (.env en balde/server) ==="
Write-Host "WHATSAPP_PROVIDER=evolution"
Write-Host "EVOLUTION_API_URL=http://localhost:8080"
Write-Host "EVOLUTION_API_KEY=$apiKey"
Write-Host "EVOLUTION_INSTANCE=$instance"
Write-Host "ALLOWED_PHONES=tu-numero-sin-mas"
Write-Host ""
Write-Host "Arranca URBA: cd balde\server && npm start"
Write-Host ""
Write-Host "=== Si URBA esta en Render (no local) ==="
Write-Host "1. ngrok http 8080"
Write-Host "2. Render: EVOLUTION_API_URL=https://TU-SUBDOMINIO.ngrok-free.app"
Write-Host "3. URBA_WEBHOOK_URL en evolution\.env = https://urba.onrender.com/api/whatsapp/webhook"
Write-Host "4. Volver a ejecutar la parte webhook de este script o setup manual"
