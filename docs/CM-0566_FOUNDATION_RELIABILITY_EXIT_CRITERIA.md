# CM-0566 Foundation Reliability Exit Criteria

Status: CM_0566_READY_FOR_COMMIT_NOT_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note defines the Phase 1 Foundation Reliability exit criteria before `codex-memory` may enter Phase 2 Mainline Memory Spine Minimum Acceptance Surface.

It exists to prevent a phase skip.

It does not execute runtime validation.

It does not authorize CM-0562.

It does not call true live `record_memory`.

It does not call true live `search_memory`.

It does not write durable memory or durable audit state.

It does not read `.jsonl` audit files or real memory content.

It does not run provider calls, HTTP observe, compare, rollback, migration/import/export/backup/restore apply, config switches, watchdog/startup changes, public MCP expansion, tag, release, deploy, cutover, or readiness claims.

## Current Phase 1 Evidence

The following Foundation Reliability items are already recorded:

| item | evidence | status |
|---|---|---|
| no-token mutation rejection JSON-RPC shape | `docs/CM-0557_JSONRPC_NO_TOKEN_MUTATION_REJECTION_PLAN.md`; implementation commit `9970511`; follow-up state docs | completed locally, not write reliability |
| search timeout read-only chain analysis | `docs/CM-0559_SEARCH_MEMORY_TIMEOUT_READONLY_ANALYSIS.md` | completed analysis, not recall reliability |
| app-level `search_memory` timeout boundary | `docs/CM-0560_SEARCH_MEMORY_TIMEOUT_BOUNDARY.md` | completed local runtime boundary, not recall reliability |
| cooperative abort boundary | `docs/CM-0561_SEARCH_MEMORY_COOPERATIVE_ABORT_BOUNDARY.md` | completed local cooperative abort, not hard cancellation |
| exact-approval packet | `docs/CM-0562_FOUNDATION_RELIABILITY_EXACT_APPROVAL_PACKET.md` | prepared only, not approved |
| candidate cache abort side-effect fixture | `docs/CM-0563_CANDIDATE_CACHE_ABORT_SIDE_EFFECT_FIXTURE.md` | completed fixture-only evidence |
| recall audit abort side-effect fixture | `docs/CM-0564_RECALL_AUDIT_ABORT_SIDE_EFFECT_FIXTURE.md` | completed fixture-only evidence |
| exact-approval baseline refresh | `docs/CM-0565_FOUNDATION_RELIABILITY_EXACT_APPROVAL_BASELINE_REFRESH.md` | completed docs-only refresh |

These items make Phase 1 stronger.

They do not by themselves complete Phase 1.

## Required Phase 1 Exit Evidence

Phase 1 cannot close until all of the following are true:

1. `AUTH_WRITE_PATH_VALIDATION_001` has an exact approval bound to fresh `HEAD`, `origin/main`, and remote main.
2. The approved authorized write validation executes within the CM-0562 limit.
3. The write validation records either:
   - `AUTHORIZED_WRITE_PATH_VALIDATED_NOT_READY`, or
   - `AUTHORIZED_WRITE_PATH_VALIDATION_FAILED_NOT_READY`.
4. If the write validation fails, the failure is repaired or explicitly carried as a blocker.
5. `BOUNDED_RECALL_VALIDATION_001` has an exact approval bound to fresh `HEAD`, `origin/main`, and remote main.
6. The approved bounded recall validation executes within the CM-0562 limit.
7. The recall validation records either:
   - `BOUNDED_RECALL_VALIDATED_NOT_READY`, or
   - `BOUNDED_RECALL_VALIDATION_FAILED_NOT_READY`.
8. If the recall validation fails or times out, the failure is repaired or explicitly carried as a blocker.
9. `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md` is updated with fresh evidence and does not overclaim gap closure.
10. `.agent_board` records validation commands, skipped validation, blocked actions, and no-overclaim status.

## Phase 2 Entry Gate

Phase 2 may begin only after Phase 1 closeout records:

```text
PHASE_1_FOUNDATION_RELIABILITY_ACCEPTED_NOT_READY
```

That result would mean Phase 1 reliability blockers have been bounded and evidenced enough to plan Phase 2, while still preserving:

```text
memory write reliable: not claimed
memory recall reliable: not claimed
runtime ready: not claimed
RC ready: not claimed
production ready: not claimed
controlling status: RC_NOT_READY_BLOCKED
```

Phase 2 must not start from fixture evidence alone.

Phase 2 must not start from CM-0562 packet existence alone.

Phase 2 must not start from docs-only baseline refresh alone.

## Forbidden Shortcut

Do not treat these as Phase 1 completion:

- no-token rejection shape fixed
- timeout boundary exists
- cooperative abort checks exist
- candidate cache fixture passed
- recall audit fixture passed
- CM-0562 packet exists
- CM-0565 baseline refresh exists
- docs validation passed
- `npm test` passed
- branch is pushed

Those are necessary supporting evidence, not sufficient exit evidence.

## Next Safe Action

The next substantive action is still CM-0562 exact approval.

Without exact approval, only docs/board clarification and fixture-only local tests may continue.
