param(
  [ValidateSet("auto","docs","test","mainline","strict","http","active","ordering","provider","profile","rollback")]
  [string]$Area = "auto",
  [switch]$Strict
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host ""
  Write-Host "==> $msg"
}

function Has-NpmScript($name) {
  if (!(Test-Path "package.json")) { return $false }
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  if (!$pkg.scripts) { return $false }
  return [bool]($pkg.scripts.PSObject.Properties.Name -contains $name)
}

$failures = New-Object System.Collections.Generic.List[string]

function Run-Step($label, $cmd, [string[]]$CommandArgs = @()) {
  Write-Step $label
  try {
    & $cmd @CommandArgs
    $code = $LASTEXITCODE
    if ($null -ne $code -and $code -ne 0) {
      $script:failures.Add("$label failed with exit code $code")
    }
  } catch {
    $script:failures.Add("$label failed: $($_.Exception.Message)")
  }
}

Write-Step "codex-memory validate-local.ps1"
Write-Host "Area: $Area"
Write-Host "Workspace: $((Get-Location).Path)"

if (Test-Path ".git") {
  Run-Step "git status --short" "git" @("status", "--short")
}

if (!(Test-Path "package.json")) {
  $failures.Add("package.json not found; this does not look like the codex-memory project root.")
} else {
  Write-Step "Available npm scripts"
  npm run
}

function Run-NpmScript($scriptName, [string[]]$extraArgs = @()) {
  if (Has-NpmScript $scriptName) {
    $npmArgs = @("run", $scriptName) + $extraArgs
    Run-Step "npm run $scriptName $($extraArgs -join ' ')" "npm" $npmArgs
  } else {
    $script:failures.Add("Missing npm script: $scriptName")
  }
}

switch ($Area) {
  "docs" {
    Write-Step "Docs validation"
    Write-Host "Docs-only validation requires diff inspection by the agent."
  }
  "test" {
    Run-NpmScript "test"
  }
  "mainline" {
    Run-NpmScript "gate:mainline"
  }
  "strict" {
    Run-NpmScript "gate:mainline:strict"
  }
  "http" {
    Run-NpmScript "start:http:ensure"
    Run-NpmScript "observe:http" @("--", "--json")
    Run-NpmScript "start:http:watchdog:once"
  }
  "active" {
    Run-NpmScript "compare-active-memory" @("--", "--suite", ".\benchmarks\active-memory-suite\standard-suite.json", "--json", "--require-match")
    Run-NpmScript "rollback-active-memory" @("--", "--suite", ".\benchmarks\active-memory-suite\standard-suite.json", "--json", "--require-ready")
  }
  "ordering" {
    if (Test-Path ".\tests\phase-c-active-recall.test.js") {
      Run-Step "node --test .\tests\phase-c-active-recall.test.js" "node" @("--test", ".\tests\phase-c-active-recall.test.js")
    } else {
      $failures.Add("Missing ordering test: .\tests\phase-c-active-recall.test.js")
    }
    Run-NpmScript "compare-active-memory" @("--", "--suite", ".\benchmarks\active-memory-suite\standard-suite.json", "--category", "ordering", "--json", "--require-match")
    Run-NpmScript "rollback-active-memory" @("--", "--suite", ".\benchmarks\active-memory-suite\standard-suite.json", "--category", "ordering", "--json", "--require-ready")
  }
  "provider" {
    Run-NpmScript "provider-smoke" @("--", "--json")
    Run-NpmScript "provider-benchmark" @("--", "--json")
  }
  "profile" {
    Run-NpmScript "rebuild-profile" @("--", "--dry-run", "--json")
    Run-NpmScript "profile-health"
    Run-NpmScript "shadow-compare" @("--", "--query", "embedding profile migration")
    Run-NpmScript "profile-gate" @("--", "--json", "--summary-only")
  }
  "rollback" {
    Run-NpmScript "rollback:mainline:plan" @("--", "--json")
  }
  "auto" {
    if (Has-NpmScript "test") {
      Run-NpmScript "test"
    } else {
      $failures.Add("Missing npm script: test")
    }
    if ($Strict) {
      if (Has-NpmScript "gate:mainline") {
        Run-NpmScript "gate:mainline"
      }
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "VALIDATION FAILED"
  foreach ($f in $failures) {
    Write-Host "- $f"
  }
  exit 1
}

Write-Host ""
Write-Host "VALIDATION PASSED"
exit 0
