@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "WSL_EXE=%SystemRoot%\System32\wsl.exe"
for %%I in ("%~dp0..") do set "REPO_ROOT=%%~fI"
set "LINUX_SCRIPT=./scripts/launch-owner-runtime-mapping-package.sh"

if not exist "%WSL_EXE%" (
  echo The system WSL launcher was not found. No mapping-package action was performed.
  echo.
  pause
  exit /b 2
)

echo Opening the Codex Memory owner-only mapping-package assistant...
if defined CODEX_MEMORY_WSL_DISTRO (
  "%WSL_EXE%" -d "%CODEX_MEMORY_WSL_DISTRO%" --cd "%REPO_ROOT%" -- bash "%LINUX_SCRIPT%"
) else (
  "%WSL_EXE%" --cd "%REPO_ROOT%" -- bash "%LINUX_SCRIPT%"
)
set "exit_code=%ERRORLEVEL%"

if not "%exit_code%"=="0" (
  echo.
  echo The assistant stopped with exit code %exit_code%.
  echo No runtime was started by this Windows launcher.
  pause
)

exit /b %exit_code%
