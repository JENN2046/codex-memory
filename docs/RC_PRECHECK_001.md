# RC_PRECHECK_001

Phase: `RC_PRECHECK_001`

Mode: `target refreshed; not approved for execution`

Risk: `A4 docs/board refresh only`

Decision: `NOT_READY_BLOCKED`

Current packet target commit: `765ab1825535c8b66078e50ff43ac519488d25f8`

## Purpose

Keep the `RC_PRECHECK_001` execution map accurate after local commits moved `HEAD` beyond earlier evidence targets.

This record is a planning and approval surface only. It does not execute RC precheck and does not claim `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, cutover readiness, migration readiness, or production readiness.

## Current Execution Status

`RC_PRECHECK_001` is not ready to execute because the approval packet required a target/baseline refresh. The target has now been refreshed to the current local `HEAD`, but no new exact A5 execution approval has been granted for this target.

## Allowed Future Readonly Precheck Commands

A future exact `A5-RC-PRECHECK-READONLY` approval may authorize only these local/readonly validation commands:

```powershell
git status -sb
git log --oneline --decorate -n 10
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:mainline:strict
npm run observe:http -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

`npm run observe:http -- --json` is loopback/local observability evidence only. It does not prove live service readiness, production readiness, config/watchdog/startup readiness, cutover readiness, or `RC_READY`.

## Forbidden Actions

A readonly precheck does not authorize:

- recall path observation without separate exact `A5-RC-PRECHECK-RECALL` approval
- provider calls
- real memory broad scans
- migration/import/export apply
- backup/restore apply
- public MCP expansion
- durable memory writes
- config/watchdog/startup changes
- push, tag, release, deploy, or RC cutover
- A5-GAP-7
- readiness claims

## Checklist

| item | required evidence | current source | status |
|---|---|---|---|
| Git baseline | Exact `HEAD`, branch, ahead/behind, and tracked worktree state | future exact execution: `git status -sb`; `git log --oneline --decorate -n 10` | pending for current target |
| Strict gate | Fresh local strict gate evidence for the target commit | future exact execution: `npm run gate:mainline:strict` | pending exact approval |
| HTTP observe | Loopback HTTP health and observability summary | future exact execution: `npm run observe:http -- --json` | pending exact approval; not production readiness |
| Recall audit | One real recall path observation if needed | separate `A5-RC-PRECHECK-RECALL` approval only | not approved |
| Active-memory compare | Donor-compatible active-memory compare suite | future exact execution: compare command | pending exact approval |
| Active-memory rollback | Rollback readiness suite | future exact execution: rollback command | pending exact approval |
| Public MCP freeze | Public tools remain `record_memory`, `search_memory`, `memory_overview` | contract/gate evidence if approved | pending exact approval |
| A5 hard stops | Provider, real memory broad scan, migration/apply, backup/restore, config/watchdog/startup, public MCP expansion, push/tag/release/deploy, cutover | `AGENTS.md`; current runtime gap truth table | all remain blocked |
| Remaining runtime gaps | Current gap count and next exact approved action, if any | `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` | still `NOT_READY_BLOCKED` |

## Evidence Output Shape

Maximum successful future readonly result:

```text
PRECHECK_PASSED_NOT_RC_READY
```

Any warning, failure, missing approval, target drift, stale baseline, or boundary ambiguity must resolve to:

```text
NOT_READY_BLOCKED
```

Required readiness flags:

```text
runtimeReady=false
finalRcMatrixReady=false
v1RcReady=false
rcReady=false
```

## Next Safe Step

Ask for a new exact `A5-RC-PRECHECK-READONLY` approval bound to `765ab1825535c8b66078e50ff43ac519488d25f8`, or continue local-safe docs/fixture/design work. Do not run RC precheck until that approval exists.