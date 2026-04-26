$ErrorActionPreference = 'Stop'

$taskName = 'CodexMemoryHttpMcpWatchdog'
$scriptPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'watch-codex-memory-http.ps1')).Path
$powerShellPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$runValue = "`"$powerShellPath`" $arguments"

try {
  & schtasks.exe /Create /F /TN $taskName /SC ONLOGON /TR $runValue 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Output "Scheduled task installed: $taskName"
    exit 0
  }
} catch {
  # fall through to HKCU Run fallback
}

$runKeyPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
if (-not (Test-Path -LiteralPath $runKeyPath)) {
  New-Item -Path $runKeyPath | Out-Null
}
New-ItemProperty -Path $runKeyPath -Name $taskName -Value $runValue -PropertyType String -Force | Out-Null
Write-Output "Scheduled task install failed; configured HKCU Run fallback: $taskName"
exit 0
