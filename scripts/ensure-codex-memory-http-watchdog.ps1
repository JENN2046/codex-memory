$ErrorActionPreference = 'Stop'

$watchScriptPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'watch-codex-memory-http.ps1')).Path
$powerShellPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$watchScriptPath`""

$existing = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object {
  $_.CommandLine -and $_.CommandLine -like '*watch-codex-memory-http.ps1*'
} | Select-Object -First 1

if ($existing) {
  Write-Output "watchdog already running (pid=$($existing.ProcessId))"
  exit 0
}

$process = Start-Process -FilePath $powerShellPath -ArgumentList $arguments -WindowStyle Hidden -PassThru
Write-Output "watchdog started (pid=$($process.Id))"
exit 0
