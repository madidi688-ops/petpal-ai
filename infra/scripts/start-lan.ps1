# PetPal mobile LAN setup
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File .\infra\scripts\start-lan.ps1

$ErrorActionPreference = 'Stop'
Remove-Item Env:SSL_CERT_FILE -ErrorAction SilentlyContinue

function Get-LanIp {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.InterfaceAlias -notmatch 'WSL|vEthernet|Loopback|Virtual|Hyper-V'
    } |
    Sort-Object {
      if ($_.InterfaceAlias -match 'WLAN|Wi-?Fi') { 0 }
      elseif ($_.InterfaceAlias -match 'Ethernet|以太网') { 1 }
      else { 2 }
    }
  if (-not $candidates) { throw 'No LAN IPv4 found. Connect Wi-Fi first.' }
  return $candidates[0].IPAddress
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$ip = Get-LanIp
$api = "http://${ip}:4001"
$web = "http://${ip}:3000"

$envLocal = Join-Path $root 'frontend\.env.local'
@(
  "NEXT_PUBLIC_API_BASE_URL=$api"
  "NEXTAUTH_URL=$web"
  "NEXTAUTH_SECRET=petpal-dev-secret-change-in-production"
) | Set-Content -Path $envLocal -Encoding UTF8

$backendEnv = Join-Path $root 'backend\.env'
if (Test-Path $backendEnv) {
  $raw = Get-Content $backendEnv -Raw
  if ($raw -match '(?m)^PUBLIC_BASE_URL=') {
    $raw = $raw -replace '(?m)^PUBLIC_BASE_URL=.*$', "PUBLIC_BASE_URL=$api"
  } else {
    if ($raw -notmatch '\r?\n$') { $raw += "`r`n" }
    $raw += "PUBLIC_BASE_URL=$api`r`n"
  }
  if ($raw -notmatch '(?m)^CORS_ORIGIN=') {
    $raw += "CORS_ORIGIN=$web,http://localhost:3000`r`n"
  }
  Set-Content -Path $backendEnv -Value $raw -NoNewline
}

Write-Host ""
Write-Host "=== Mobile LAN ready ==="
Write-Host "LAN IP : $ip"
Write-Host "Open on phone : $web"
Write-Host "API           : $api"
Write-Host ""
Write-Host "Checklist:"
Write-Host "  1. Phone and PC on same Wi-Fi"
Write-Host "  2. Restart backend (listens 0.0.0.0:4001)"
Write-Host "  3. Frontend: cd frontend; npm.cmd run dev:lan"
Write-Host "  4. Allow Windows firewall inbound 3000 and 4001 if blocked"
Write-Host ""
Write-Host "Note: Phone HTTP often blocks microphone."
Write-Host "      Use upload mp3/wav for voice; text/image/video usually OK."
Write-Host ""
