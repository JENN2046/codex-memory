param(
  [int]$IntervalSeconds = 120,
  [switch]$Once
)

$ErrorActionPreference = 'Stop'

$projectDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$ensureScript = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'ensure-codex-memory-http.ps1')).Path
$logsDir = Join-Path $projectDir 'logs'
$logPath = Join-Path $logsDir 'codex-memory-http-watchdog.log'

if ($IntervalSeconds -lt 15) {
  $IntervalSeconds = 15
}

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Write-WatchdogLog([string]$level, [string]$message) {
  $timestamp = [DateTime]::UtcNow.ToString('o')
  $line = "[$timestamp] $level $message"
  Add-Content -LiteralPath $logPath -Value $line
}

$mutexName = 'CodexMemoryHttpMcpWatchdog'
$mutex = New-Object System.Threading.Mutex($false, $mutexName)
$hasLock = $mutex.WaitOne(0, $false)
if (-not $hasLock) {
  Write-WatchdogLog 'INFO' 'watchdog already running; exiting duplicate instance'
  exit 0
}

try {
  Write-WatchdogLog 'INFO' "watchdog started (interval=${IntervalSeconds}s, once=$($Once.IsPresent))"

  while ($true) {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $ensureScript 2>&1
    $exitCode = $LASTEXITCODE
    $text = (($output | Out-String) -replace '\r', '') -replace '\n+$', ''

    if ($exitCode -eq 0) {
      if ($text -match 'started \(pid=') {
        Write-WatchdogLog 'WARN' "service recovered: $text"
      } elseif ($Once) {
        Write-WatchdogLog 'INFO' $text
      }
    } else {
      Write-WatchdogLog 'ERROR' "ensure failed (exit=$exitCode): $text"
    }

    if ($Once) {
      break
    }

    Start-Sleep -Seconds $IntervalSeconds
  }
} finally {
  if ($hasLock) {
    $mutex.ReleaseMutex() | Out-Null
  }
  $mutex.Dispose()
}
