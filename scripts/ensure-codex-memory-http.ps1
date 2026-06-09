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
$fingerprintPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'print-runtime-fingerprint.js')).Path

function Get-HealthPayload([string]$url) {
  try {
    return Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2
  } catch {
    return $null
  }
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

function Get-ExpectedRuntimeFingerprint() {
  $value = (& $nodePath $fingerprintPath 2>$null)
  if (-not $value) {
    Write-Error 'Unable to compute codex-memory runtime source fingerprint.'
    exit 1
  }
  return [string]$value.Trim()
}

function Test-RuntimeFreshness([object]$payload, [string]$expected) {
  if (-not $payload -or -not $payload.ok) {
    return $false
  }
  $actual = $payload.runtimeFreshness.sourceFingerprint
  if (-not $actual) {
    return $false
  }
  return [string]$actual -eq [string]$expected
}

$expectedFingerprint = Get-ExpectedRuntimeFingerprint
$existingHealth = Get-HealthPayload -url $healthUrl
if ($existingHealth -and $existingHealth.ok -eq $true) {
  if (Test-RuntimeFreshness -payload $existingHealth -expected $expectedFingerprint) {
    Write-Output "codex-memory HTTP MCP already healthy and fresh at $healthUrl"
    exit 0
  }
  Write-Error "codex-memory HTTP MCP is healthy but runtime freshness does not match current source fingerprint at $healthUrl"
  exit 1
}

$process = Start-Process -FilePath $nodePath -ArgumentList @($entryPath) -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  $startedHealth = Get-HealthPayload -url $healthUrl
  if (Test-RuntimeFreshness -payload $startedHealth -expected $expectedFingerprint) {
    Write-Output "codex-memory HTTP MCP started fresh (pid=$($process.Id)) at $healthUrl"
    exit 0
  }
  if ($process.HasExited) {
    Write-Error "codex-memory HTTP MCP process exited early with code $($process.ExitCode)."
    exit 1
  }
}

Write-Error "codex-memory HTTP MCP failed health check within timeout: $healthUrl"
exit 1
