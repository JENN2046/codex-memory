param(
  [ValidateSet("auto","docs","test","mainline","strict","http","active","ordering","provider","profile","rollback")]
  [string]$Area = "auto",
  [switch]$Strict,
  [switch]$QuietScripts
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

if ($Area -eq "docs") {
  $QuietScripts = $true
}

if (Test-Path ".git") {
  Run-Step "git status --short" "git" @("status", "--short")
}

if (!(Test-Path "package.json")) {
  $failures.Add("package.json not found; this does not look like the codex-memory project root.")
} elseif ($QuietScripts) {
  Write-Step "Available npm scripts"
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $scriptCount = 0
  if ($pkg.scripts) {
    $scriptCount = @($pkg.scripts.PSObject.Properties).Count
  }
  Write-Host "QuietScripts: skipped full npm run listing ($scriptCount scripts detected)."
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
    if (Test-Path ".\scripts\validate_autopilot_governance_kernel.js") {
      Run-Step "node --check .\scripts\validate_autopilot_governance_kernel.js" "node" @("--check", ".\scripts\validate_autopilot_governance_kernel.js")
      Run-Step "node .\scripts\validate_autopilot_governance_kernel.js" "node" @(".\scripts\validate_autopilot_governance_kernel.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_ledger_consistency.js") {
      Run-Step "node --check .\scripts\validate_autopilot_ledger_consistency.js" "node" @("--check", ".\scripts\validate_autopilot_ledger_consistency.js")
      Run-Step "node .\scripts\validate_autopilot_ledger_consistency.js" "node" @(".\scripts\validate_autopilot_ledger_consistency.js")
    }
    if (Test-Path ".\scripts\validate_current_facts_drift.js") {
      Run-Step "node --check .\scripts\validate_current_facts_drift.js" "node" @("--check", ".\scripts\validate_current_facts_drift.js")
      Run-Step "node .\scripts\validate_current_facts_drift.js" "node" @(".\scripts\validate_current_facts_drift.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_goal_compiler.js") {
      Run-Step "node --check .\scripts\validate_autopilot_goal_compiler.js" "node" @("--check", ".\scripts\validate_autopilot_goal_compiler.js")
      Run-Step "node .\scripts\validate_autopilot_goal_compiler.js" "node" @(".\scripts\validate_autopilot_goal_compiler.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_closed_loop.js") {
      Run-Step "node --check .\scripts\validate_autopilot_closed_loop.js" "node" @("--check", ".\scripts\validate_autopilot_closed_loop.js")
      Run-Step "node .\scripts\validate_autopilot_closed_loop.js" "node" @(".\scripts\validate_autopilot_closed_loop.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_controller.js") {
      Run-Step "node --check .\scripts\validate_autopilot_controller.js" "node" @("--check", ".\scripts\validate_autopilot_controller.js")
      Run-Step "node .\scripts\validate_autopilot_controller.js" "node" @(".\scripts\validate_autopilot_controller.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_state_store_draft.js") {
      Run-Step "node --check .\scripts\validate_autopilot_state_store_draft.js" "node" @("--check", ".\scripts\validate_autopilot_state_store_draft.js")
      Run-Step "node .\scripts\validate_autopilot_state_store_draft.js" "node" @(".\scripts\validate_autopilot_state_store_draft.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_action_adapter_contract.js") {
      Run-Step "node --check .\scripts\validate_autopilot_action_adapter_contract.js" "node" @("--check", ".\scripts\validate_autopilot_action_adapter_contract.js")
      Run-Step "node .\scripts\validate_autopilot_action_adapter_contract.js" "node" @(".\scripts\validate_autopilot_action_adapter_contract.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_validation_planner.js") {
      Run-Step "node --check .\scripts\validate_autopilot_validation_planner.js" "node" @("--check", ".\scripts\validate_autopilot_validation_planner.js")
      Run-Step "node .\scripts\validate_autopilot_validation_planner.js" "node" @(".\scripts\validate_autopilot_validation_planner.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_replay_harness.js") {
      Run-Step "node --check .\scripts\validate_autopilot_replay_harness.js" "node" @("--check", ".\scripts\validate_autopilot_replay_harness.js")
      Run-Step "node .\scripts\validate_autopilot_replay_harness.js" "node" @(".\scripts\validate_autopilot_replay_harness.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_operator_console.js") {
      Run-Step "node --check .\scripts\validate_autopilot_operator_console.js" "node" @("--check", ".\scripts\validate_autopilot_operator_console.js")
      Run-Step "node .\scripts\validate_autopilot_operator_console.js" "node" @(".\scripts\validate_autopilot_operator_console.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_controlled_green_executor_entry.js") {
      Run-Step "node --check .\scripts\validate_autopilot_controlled_green_executor_entry.js" "node" @("--check", ".\scripts\validate_autopilot_controlled_green_executor_entry.js")
      Run-Step "node .\scripts\validate_autopilot_controlled_green_executor_entry.js" "node" @(".\scripts\validate_autopilot_controlled_green_executor_entry.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_fixture_green_executor.js") {
      Run-Step "node --check .\scripts\validate_autopilot_fixture_green_executor.js" "node" @("--check", ".\scripts\validate_autopilot_fixture_green_executor.js")
      Run-Step "node .\scripts\validate_autopilot_fixture_green_executor.js" "node" @(".\scripts\validate_autopilot_fixture_green_executor.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_green_file_write_boundary.js") {
      Run-Step "node --check .\scripts\validate_autopilot_green_file_write_boundary.js" "node" @("--check", ".\scripts\validate_autopilot_green_file_write_boundary.js")
      Run-Step "node .\scripts\validate_autopilot_green_file_write_boundary.js" "node" @(".\scripts\validate_autopilot_green_file_write_boundary.js")
    }
    if (Test-Path ".\scripts\validate_autopilot_green_file_write_executor_contract.js") {
      Run-Step "node --check .\scripts\validate_autopilot_green_file_write_executor_contract.js" "node" @("--check", ".\scripts\validate_autopilot_green_file_write_executor_contract.js")
      Run-Step "node .\scripts\validate_autopilot_green_file_write_executor_contract.js" "node" @(".\scripts\validate_autopilot_green_file_write_executor_contract.js")
    }
    if (Test-Path ".\tests\post-push-gate-compact-mode-contract.test.js") {
      Run-Step "node --test .\tests\post-push-gate-compact-mode-contract.test.js" "node" @("--test", ".\tests\post-push-gate-compact-mode-contract.test.js")
    }
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
