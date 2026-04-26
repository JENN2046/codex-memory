$ErrorActionPreference = 'Stop'

$hostName = if ($env:CODEX_MEMORY_HTTP_HOST) { $env:CODEX_MEMORY_HTTP_HOST } else { '127.0.0.1' }
$port = 0
if ($env:CODEX_MEMORY_HTTP_PORT -and [int]::TryParse($env:CODEX_MEMORY_HTTP_PORT, [ref]$port)) {
  $port = [int]$env:CODEX_MEMORY_HTTP_PORT
} else {
  $port = 7605
}

$healthUrl = "http://$hostName`:$port/health"
$projectDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$entryPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'serve-codex-memory-http.js')).Path

function Test-Health([string]$url) {
  try {
    $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2
    return $resp -and $resp.ok -eq $true
  } catch {
    return $false
  }
}

if (Test-Health -url $healthUrl) {
  Write-Output "codex-memory HTTP MCP already healthy at $healthUrl"
  exit 0
}

$nodePath = $null
try {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
} catch {
  $fallback = 'C:\Program Files\nodejs\node.exe'
  if (Test-Path -LiteralPath $fallback) {
    $nodePath = $fallback
  }
}

if (-not $nodePath) {
  Write-Error 'Unable to locate node.exe for codex-memory HTTP MCP startup.'
  exit 1
}

$process = Start-Process -FilePath $nodePath -ArgumentList @($entryPath) -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  if (Test-Health -url $healthUrl) {
    Write-Output "codex-memory HTTP MCP started (pid=$($process.Id)) at $healthUrl"
    exit 0
  }
  if ($process.HasExited) {
    Write-Error "codex-memory HTTP MCP process exited early with code $($process.ExitCode)."
    exit 1
  }
}

Write-Error "codex-memory HTTP MCP failed health check within timeout: $healthUrl"
exit 1
