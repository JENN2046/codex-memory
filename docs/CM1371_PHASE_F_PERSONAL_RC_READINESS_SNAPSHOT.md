# CM-1371 Phase F Personal RC Readiness Snapshot

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1371 adds a local read-only Phase F personal RC evidence readiness snapshot.

This is local source/CLI/test/docs/board work only. It does not push, pull, merge, rebase, rerun F1, execute F2/F3/F4/F5, call MCP, call providers, read real memory/audit data, write durable memory/audit data, change config/watchdog/startup, expand public MCP tools, or claim runtime/RC readiness.

## Change

New files:

```text
src/core/PhaseFPersonalRcReadinessSnapshot.js
src/cli/phase-f-personal-rc-readiness-snapshot.js
tests/phase-f-personal-rc-readiness-snapshot.test.js
```

The snapshot reports:

```text
target=PERSONAL_DOGFOOD_READY_NOT_RC_READY
targetCurrentlyAchieved
F1 live_client_no_write_contract_refresh
F2 a5_gap6_aggregation_refresh
F3 true_live_recall_negative_control_proof
F4 minimal_personal_dogfood_write_preflight
F5 personal_rc_closeout
blockingPhase
nextRequiredAction
completionCriteria
safetyCounters
```

Default CLI execution reads local Git facts and the existing F1 sync packet only. Evidence flags default to false unless explicitly supplied by the caller.

The CLI rejects side-effect flags such as:

```text
--execute
--push
--rerun-f1
--call-mcp
--record-memory
--search-memory
--provider
--readiness-claim
```

## Validation

```text
node --check src\core\PhaseFPersonalRcReadinessSnapshot.js
node --check src\cli\phase-f-personal-rc-readiness-snapshot.js
node --check tests\phase-f-personal-rc-readiness-snapshot.test.js
node --test tests\phase-f-personal-rc-readiness-snapshot.test.js
node src\cli\phase-f-personal-rc-readiness-snapshot.js --json --pretty
node src\cli\phase-f-personal-rc-readiness-snapshot.js --push
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Results:

```text
targeted_snapshot_tests=4/4
side_effect_flag_rejection=passed
npm_test=2894/2894
ledger_consistency=passed
docs_validation=passed
```

Development-state CLI self-check correctly reports `blockingPhase=F1`, `decision=NOT_READY_BLOCKED`, `readinessClaimAllowed=false`, and no side-effect counters.

## Remaining State

F1 still requires explicit normal non-force push approval, successful push, fresh synced HEAD, exact A5-GAP-4 approval, and bounded live no-write rerun.

F2/F3/F4/F5 remain blocked until accepted F1 live evidence exists.
