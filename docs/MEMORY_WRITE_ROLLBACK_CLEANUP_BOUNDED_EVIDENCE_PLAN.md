# Memory Write Rollback Cleanup Bounded Evidence Plan

Status: `MEMORY_WRITE_ROLLBACK_CLEANUP_BOUNDED_EVIDENCE_PLAN_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0841`

## Purpose

This plan defines the next bounded evidence layer for memory write rollback and cleanup posture after `CM-0840`.

The plan converts the posture review into a fixture/temp-local evidence target. It does not run the evidence, does not apply cleanup, does not apply rollback, does not execute true live `record_memory`, and does not claim `memory write reliable`.

## Evidence Boundary

Allowed evidence scope:

- Fixture-only store stubs.
- Isolated temp-local workspace under a run-specific temp root.
- Synthetic write records only.
- Synthetic diary / SQLite shadow / vector / chunk / audit / reconcile / cache state only.
- No real memory store.
- No direct `.jsonl` or durable memory content read.
- No provider/model/API call.
- No public MCP expansion.
- No package/config/watchdog/startup change.
- No real cleanup apply or rollback apply.

The evidence must prove cleanup accounting and rollback posture only. It must not delete or mutate real memory state.

## Target Scenarios

| scenario | setup | expected evidence |
|---|---|---|
| Rejected validation write | Synthetic invalid payload rejected by `MemoryWriteService` before projection. | Diary, SQLite shadow, vector, chunk, reconcile, and cache counters stay zero; normal rejected audit accounting is visible. |
| CM-0838 preflight-rejected write | `writePreflightEnabled=true` with bounded candidate provider causing a same-scope duplicate or scope drift rejection. | No diary/shadow/vector/chunk projection; normal rejected audit accounting; optional returned `writePreflight` summary captured without durable preflight-audit overclaim. |
| Accepted all-projection write | Synthetic accepted payload written to isolated temp-local stores. | Diary file, SQLite shadow/chunks, vector, and accepted audit are all counted; no rollback is applied. |
| Accepted degraded SQLite/vector/chunk write | Synthetic store failure after diary write or after partial projection. | Degraded projection status and reconcile task accounting are visible; evidence records which surfaces are left dirty. |
| Partial cleanup simulation | Synthetic cleanup primitives are invoked only inside fixture/temp-local root. | SQLite/vector deletion counters can clear partial projection state, while diary/audit/reconcile/cache residual state is explicitly reported. |
| Non-destructive remediation posture | Synthetic bad-write correction represented as lifecycle/governance recommendation only. | Audit remains append-only; plan points to future supersession/tombstone/forget evidence instead of destructive audit rewrite. |

## Proposed Targeted Test Shape

Candidate file:

- `tests/memory-write-rollback-cleanup-bounded-evidence.test.js`

Candidate command:

```powershell
node --check tests\memory-write-rollback-cleanup-bounded-evidence.test.js
node --test tests\memory-write-rollback-cleanup-bounded-evidence.test.js
```

The test should use one of two safe designs:

1. Fixture-only fake stores with explicit counters for diary, SQLite shadow, vector, chunks, audit, reconcile, and cache.
2. Isolated temp-local stores under a run-specific temp root, with cleanup verification limited to that temp root.

The smallest useful implementation may start with fixture-only counters and add temp-local store evidence later.

## Pass Criteria

The bounded evidence passes only if it shows:

- rejected validation writes create no durable memory projections;
- CM-0838 preflight-rejected writes create no durable memory projections;
- accepted writes expose all created projection surfaces;
- degraded accepted writes expose partial state and reconcile accounting;
- SQLite/vector cleanup primitives are classified as partial cleanup only;
- diary cleanup remains unproven unless implemented in fixture/temp-local scope;
- audit remains append-only and is not destructively rewritten;
- cache/reconcile residual posture is explicitly recorded;
- cleanup or rollback apply never touches real memory;
- no provider/API call occurs;
- no direct `.jsonl` or real durable memory content read occurs;
- no public MCP expansion occurs;
- no readiness or reliability claim is made.

## Fail Criteria

The evidence must fail closed if:

- any real memory path is used;
- any direct `.jsonl` or durable memory content read is attempted;
- provider/API/model access is attempted;
- cleanup apply or rollback apply escapes the fixture/temp-local boundary;
- audit deletion or rewrite is attempted;
- unknown projection/counter state is treated as clean;
- accepted degraded write residual state is hidden;
- the result claims `memory write reliable`, runtime readiness, RC readiness, or production readiness.

## Evidence Output Shape

The future execution document should report:

```text
result_label:
scenario_results:
  rejected_validation_no_projection:
  preflight_rejected_no_projection:
  accepted_projection_accounting:
  degraded_projection_accounting:
  partial_cleanup_accounting:
  audit_append_only_posture:
side_effect_counters:
  true_live_record_memory_calls:
  true_live_search_memory_calls:
  real_memory_reads:
  direct_jsonl_reads:
  provider_calls:
  durable_real_memory_writes:
  durable_real_audit_writes:
  cleanup_apply:
  rollback_apply:
  public_mcp_expansion:
non_claims:
  memory_write_reliable:
  runtime_ready:
  rc_ready:
  production_ready:
```

## Next Execution Label

Future execution should use one of:

- `MEMORY_WRITE_ROLLBACK_CLEANUP_BOUNDED_EVIDENCE_COMPLETED_NOT_READY`
- `MEMORY_WRITE_ROLLBACK_CLEANUP_BOUNDED_EVIDENCE_FAILED_NOT_READY`
- `BLOCKED_SCOPE_DRIFT`
- `BLOCKED_VALIDATION_FAILED`
- `BLOCKED_HARD_STOP_REQUIRED`

## Non-Claims

This plan does not claim:

- `memory write reliable`
- default unattended write reliability
- broad `record_memory` reliability
- real cleanup safety
- real rollback safety
- runtime readiness
- RC readiness
- production readiness
- V8 implementation
- VCP full parity

`RC_NOT_READY_BLOCKED` remains the controlling state.
