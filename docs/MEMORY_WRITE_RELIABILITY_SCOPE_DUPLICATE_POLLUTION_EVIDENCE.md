# Memory Write Reliability Scope, Duplicate, And Pollution Evidence

Date: 2026-05-23
Task: CM-0835
Status: MEMORY_WRITE_RELIABILITY_SCOPE_DUPLICATE_POLLUTION_EVIDENCE_COMPLETED_NOT_READY
Scope: synthetic temp-local write-path evidence; no real memory store

## Boundary

This slice extends the CM-0834 temp-local evidence with three additional write-reliability dimensions:

- scope and lifecycle metadata projection;
- duplicate synthetic payload behavior;
- secret-like bad-memory pollution rejection.

It uses only isolated temp-local stores and synthetic payloads. It does not execute true live `record_memory`, true live `search_memory`, provider/API calls, real memory scans, real memory content reads, direct real `.jsonl` reads, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup changes, release/cutover, or readiness transitions.

## Evidence

Targeted validation:

```text
node --check tests\memory-write-reliability-temp-local-evidence.test.js
node --test tests\memory-write-reliability-temp-local-evidence.test.js
```

Observed result:

```text
4/4 tests passed
```

Covered behavior:

| Dimension | Evidence | Limit |
|---|---|---|
| Scope projection | accepted synthetic process payload persists `projectId`, `workspaceId`, `clientId`, `taskId`, `conversationId`, `visibility`, and `retentionPolicy` into temp SQLite shadow records | does not prove full lifecycle governance |
| Duplicate behavior | repeated identical synthetic payloads are accepted as two separate bounded writes with distinct `memoryId` values and two audit events | proves current behavior is not idempotent by payload; idempotence remains a gap |
| Secret-like pollution rejection | synthetic `api_key` content is rejected before diary/shadow/vector/chunk projection | one pollution class only |
| Cleanup posture | temp root is removed after each test | not rollback of a real durable write |

## Current Limits

This evidence still does not prove:

- true live accepted-write reliability;
- default unattended write reliability;
- payload-level idempotence or deduplication;
- full lifecycle proposal/approval/supersession/tombstone/forget behavior;
- scope-aware write suppression;
- pollution prevention across all sensitive, stale, contradicted, or rejected memory classes;
- rollback cleanup for real writes;
- long-run durability.

## Closeout

`CM-0835` narrows write reliability by making scope projection and one pollution rejection path visible in synthetic temp-local evidence. It also records the current duplicate behavior clearly: identical synthetic payloads create separate records, so idempotence / duplicate handling remains an open reliability gap.

`memory write reliable` remains exact approval required and not claimed. Runtime ready, RC ready, production ready, V8 implemented, and VCP full parity remain not claimed.

Controlling state remains `RC_NOT_READY_BLOCKED`; no row changes to `complete? = yes`.
