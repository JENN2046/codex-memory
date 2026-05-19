# RC_PRECHECK_001

Phase: `RC_PRECHECK_001`

Mode: `local precheck planning only`

Risk: `A1/A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Prepare a local v1 kernel RC precheck checklist without executing cutover, push, tag, release, deploy, provider calls, real-memory broad scans, migration/import/export apply, backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable writes, or any A5 action.

This record is a planning surface only. It does not change runtime behavior and does not claim `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, cutover readiness, migration readiness, or production readiness.

## Checklist

| item | required evidence | current source | status |
|---|---|---|---|
| Git baseline | Exact `HEAD`, branch, ahead/behind, and tracked worktree state | `git status -sb`; `git log --oneline --decorate -n 10` | required before any future RC work |
| Strict gate | Fresh local strict gate evidence for the target commit | `npm run gate:mainline:strict` | existing evidence is target-bound; rerun requires explicit scope |
| HTTP observe | Loopback HTTP health and observability summary | `npm run observe:http -- --json` | existing review evidence healthy; refresh if endpoint or runtime changes |
| Recall audit | At least one real recall path observed in recall audit | `search_memory`; `observe:http -- --json` | existing review evidence observed `recallRecentCount=1` |
| Active-memory compare | Donor-compatible active-memory compare suite | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` | existing review evidence `43/43` matched |
| Active-memory rollback | Rollback readiness suite | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` | existing review evidence `43/43` rollback-ready |
| Public MCP freeze | Public tools remain `record_memory`, `search_memory`, `memory_overview` | contract tests / tool definitions | must remain frozen unless separate approved phase expands tools |
| A5 hard stops | Provider, real memory broad scan, migration/apply, backup/restore, config/watchdog/startup, public MCP expansion, push/tag/release/deploy, cutover | `AGENTS.md`; runtime gap truth table | all remain blocked |
| Remaining runtime gaps | Current gap count and next exact approved action, if any | `docs/P66_RUNTIME_GAP_TRUTH_TABLE.md` | still `NOT_READY_BLOCKED` |

## Acceptance Criteria

- Precheck remains docs/board-only unless a later explicit task authorizes execution.
- Any future execution records exact command, target commit, target endpoint/store, and approval boundary.
- Warning-only, stale, partial, or target-mismatched evidence cannot close a runtime gap.
- The final precheck output must keep `runtimeReady=false`, `finalRcMatrixReady=false`, `v1RcReady=false`, and `rcReady=false` until all remaining gaps and A5 hard stops are closed by exact approval.

## Next Safe Step

After this docs/board cleanup is committed locally, choose either:

- prepare a read-only `RC_PRECHECK_001` execution packet that names exact local validation commands and keeps cutover blocked, or
- stop and wait for the next exact A5 approval.
