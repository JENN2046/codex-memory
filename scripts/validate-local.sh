#!/usr/bin/env bash
set -u

AREA="${1:-auto}"
STRICT="${2:-}"

failures=()

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

step "codex-memory validate-local.sh"
echo "Area: $AREA"
echo "Workspace: $(pwd)"

if [[ -d ".git" ]]; then
  run_step "git status --short" git status --short
fi

if [[ ! -f "package.json" ]]; then
  failures+=("package.json not found; this does not look like the codex-memory project root.")
else
  step "Available npm scripts"
  npm run || true
fi

case "$AREA" in
  docs)
    step "Docs validation"
    echo "Docs-only validation requires diff inspection by the agent."
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
