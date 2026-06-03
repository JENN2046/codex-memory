#!/usr/bin/env bash
set -u

AREA="auto"
STRICT=""
QUIET_SCRIPTS=false
failures=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict)
      STRICT="--strict"
      shift
      ;;
    --quiet-scripts|--quietScripts|--quiet)
      QUIET_SCRIPTS=true
      shift
      ;;
    *)
      if [[ "$AREA" == "auto" ]]; then
        AREA="$1"
      else
        failures+=("Unknown argument: $1")
      fi
      shift
      ;;
  esac
done

step() {
  echo
  echo "==> $1"
}

has_npm_script() {
  local name="$1"
  [[ -f package.json ]] || return 1
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$name'] ? 0 : 1)"
}

run_step() {
  local label="$1"
  shift
  step "$label"
  "$@"
  local code=$?
  if [[ $code -ne 0 ]]; then
    failures+=("$label failed with exit code $code")
  fi
}

run_npm_script() {
  local script="$1"
  shift || true
  if has_npm_script "$script"; then
    run_step "npm run $script $*" npm run "$script" "$@"
  else
    failures+=("Missing npm script: $script")
  fi
}

run_optional_node_script() {
  local script="$1"
  if [[ -f "$script" ]]; then
    run_step "node --check $script" node --check "$script"
    run_step "node $script" node "$script"
  fi
}

step "codex-memory validate-local.sh"
echo "Area: $AREA"
echo "Workspace: $(pwd)"

if [[ "$AREA" == "docs" ]]; then
  QUIET_SCRIPTS=true
fi

if [[ -d ".git" ]]; then
  run_step "git status --short" git status --short
fi

if [[ ! -f "package.json" ]]; then
  failures+=("package.json not found; this does not look like the codex-memory project root.")
elif [[ "$QUIET_SCRIPTS" == true ]]; then
  step "Available npm scripts"
  script_count="$(node -e "const p=require('./package.json'); console.log(p.scripts ? Object.keys(p.scripts).length : 0)")"
  echo "QuietScripts: skipped full npm run listing (${script_count} scripts detected)."
else
  step "Available npm scripts"
  npm run || true
fi

case "$AREA" in
  docs)
    step "Docs validation"
    echo "Docs-only validation requires diff inspection by the agent."
    run_optional_node_script "./scripts/validate_autopilot_governance_kernel.js"
    run_optional_node_script "./scripts/validate_autopilot_ledger_consistency.js"
    run_optional_node_script "./scripts/validate_current_facts_drift.js"
    run_optional_node_script "./scripts/validate_autopilot_goal_compiler.js"
    run_optional_node_script "./scripts/validate_autopilot_closed_loop.js"
    run_optional_node_script "./scripts/validate_autopilot_controller.js"
    run_optional_node_script "./scripts/validate_autopilot_state_store_draft.js"
    run_optional_node_script "./scripts/validate_autopilot_action_adapter_contract.js"
    run_optional_node_script "./scripts/validate_autopilot_validation_planner.js"
    run_optional_node_script "./scripts/validate_autopilot_replay_harness.js"
    run_optional_node_script "./scripts/validate_autopilot_operator_console.js"
    run_optional_node_script "./scripts/validate_autopilot_controlled_green_executor_entry.js"
    run_optional_node_script "./scripts/validate_autopilot_fixture_green_executor.js"
    run_optional_node_script "./scripts/validate_autopilot_green_file_write_boundary.js"
    run_optional_node_script "./scripts/validate_autopilot_green_file_write_executor_contract.js"
    ;;
  test)
    run_npm_script "test"
    ;;
  mainline)
    run_npm_script "gate:mainline"
    ;;
  strict)
    run_npm_script "gate:mainline:strict"
    ;;
  http)
    run_npm_script "start:http:ensure"
    run_npm_script "observe:http" -- --json
    run_npm_script "start:http:watchdog:once"
    ;;
  active)
    run_npm_script "compare-active-memory" -- --suite "./benchmarks/active-memory-suite/standard-suite.json" --json --require-match
    run_npm_script "rollback-active-memory" -- --suite "./benchmarks/active-memory-suite/standard-suite.json" --json --require-ready
    ;;
  ordering)
    if [[ -f "./tests/phase-c-active-recall.test.js" ]]; then
      run_step "node --test ./tests/phase-c-active-recall.test.js" node --test "./tests/phase-c-active-recall.test.js"
    else
      failures+=("Missing ordering test: ./tests/phase-c-active-recall.test.js")
    fi
    run_npm_script "compare-active-memory" -- --suite "./benchmarks/active-memory-suite/standard-suite.json" --category ordering --json --require-match
    run_npm_script "rollback-active-memory" -- --suite "./benchmarks/active-memory-suite/standard-suite.json" --category ordering --json --require-ready
    ;;
  provider)
    run_npm_script "provider-smoke" -- --json
    run_npm_script "provider-benchmark" -- --json
    ;;
  profile)
    run_npm_script "rebuild-profile" -- --dry-run --json
    run_npm_script "profile-health"
    run_npm_script "shadow-compare" -- --query "embedding profile migration"
    run_npm_script "profile-gate" -- --json --summary-only
    ;;
  rollback)
    run_npm_script "rollback:mainline:plan" -- --json
    ;;
  auto)
    run_npm_script "test"
    if [[ "$STRICT" == "--strict" ]]; then
      if has_npm_script "gate:mainline"; then
        run_npm_script "gate:mainline"
      fi
    fi
    ;;
  *)
    failures+=("Unknown area: $AREA")
    ;;
esac

if [[ ${#failures[@]} -gt 0 ]]; then
  echo
  echo "VALIDATION FAILED"
  for f in "${failures[@]}"; do
    echo "- $f"
  done
  exit 1
fi

echo
echo "VALIDATION PASSED"
exit 0
