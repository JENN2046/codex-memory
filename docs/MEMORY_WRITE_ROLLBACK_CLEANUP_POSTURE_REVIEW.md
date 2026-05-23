# Memory Write Rollback Cleanup Posture Review

Status: `MEMORY_WRITE_ROLLBACK_CLEANUP_POSTURE_REVIEW_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0840`

## Scope

This review classifies rollback and cleanup posture for the current `MemoryWriteService` write path after `CM-0838` and `CM-0839`.

Inputs reviewed:

- `src/core/MemoryWriteService.js`
- `src/storage/DiaryStore.js`
- `src/storage/SqliteShadowStore.js`
- `src/storage/VectorIndexStore.js`
- `src/storage/AuditLogStore.js`
- `docs/MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION.md`
- `docs/MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION_REVIEW.md`
- `tests/memory-write-preflight-runtime-integration.test.js`

This is a posture review only. It does not execute true live `record_memory`, true live `search_memory`, real memory scan, raw memory read, direct `.jsonl` or durable memory content read, provider/API call, durable memory/audit write, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup change, push, release, deploy, cutover, or readiness/reliability claim.

## Write Outcome Classes

| outcome class | durable memory projection | audit posture | cleanup / rollback posture |
|---|---|---|---|
| Validation-rejected write | No diary, SQLite shadow, vector, chunk, or cache projection should happen after current validation rejection. | Normal rejected write audit is appended. | No memory cleanup is expected; audit is append-only evidence and should not be deleted by default. |
| CM-0838 preflight-rejected write | Rejection occurs before diary / SQLite shadow / vector / chunk projection. | Normal rejected write audit is appended. The returned result includes `writePreflight` summary; detailed preflight metadata is not currently persisted as a separate durable audit schema. | No memory cleanup is expected; future review may decide whether preflight detail needs a non-destructive audit extension. |
| Accepted write with all projections ok | Diary file is written first, then SQLite shadow/vector/chunk projections may be written. | Accepted write audit is appended after result assembly. | Full rollback is not currently one atomic helper; each projection class has a different cleanup posture. |
| Accepted degraded write | Diary file may exist while SQLite shadow, vector, or chunk projection can be degraded and reconcile tasks can be enqueued. | Accepted/degraded status is visible through result and write audit. | Cleanup is partial unless a future exact-approved rollback helper coordinates diary, SQLite, vector, chunks, reconcile queue, and audit posture. |

## Store-Level Posture

| surface | observed support | posture |
|---|---|---|
| Diary file | `DiaryStore.writeRecord(record)` writes the daily-note record and sets file path metadata. No matching delete/remove helper was observed. | Accepted write cleanup cannot currently be proven complete because diary deletion is not encapsulated by a runtime rollback helper. Any real diary deletion is exact-approval/hard-gated. |
| SQLite shadow / chunks | `SqliteShadowStore.deleteRecord(memoryId)` exists; chunks are tied to records by the store schema and replacement/deletion behavior. | This is partial projection cleanup only. It does not remove diary files, vector entries, write audit entries, candidate cache, or reconcile queue state by itself. |
| Vector index | `VectorIndexStore.deleteRecord(memoryId)` exists and can flush vector state when vector indexing is enabled. | This is partial vector cleanup only. It does not remove diary files, SQLite rows/chunks, write audit entries, candidate cache, or reconcile queue state by itself. |
| Reconcile queue | `enqueueReconcileTask()` and `clearReconcileTasks()` exist for projection repair bookkeeping. | Stale reconcile task cleanup after an accepted/degraded write is not yet proven as a coordinated rollback boundary. |
| Write audit | `AuditLogStore.appendWriteAudit()` is append-only in the reviewed path. No delete/rewrite helper was observed. | Audit should remain append-only. Corrections should use future compensating lifecycle/governance records, not destructive audit deletion by default. |
| Candidate cache | Candidate cache cleanup exists elsewhere but is not a primary accepted-write projection in the reviewed write path. | Future candidate-provider/source review should decide whether accepted writes need cache invalidation or bounded candidate refresh rules. |

## Findings

1. Rejected validation and CM-0838 preflight-rejected writes are clean from the durable memory projection perspective: they occur before diary, SQLite shadow, vector, and chunk writes. The expected durable footprint is a normal rejected write audit only.
2. Accepted writes are not currently atomically rollbackable. The diary file is written before later projections, and degraded projection paths can leave diary state plus partial shadow/vector/chunk/reconcile state.
3. Existing SQLite and vector `deleteRecord(memoryId)` helpers are useful partial cleanup primitives, but they do not prove whole-write rollback across diary, audit, reconcile queue, candidate cache, and projection stores.
4. Write audit is append-only and should stay non-destructive. Bad write remediation should be modeled as future lifecycle/governance state such as supersession, tombstone, forget, or compensating correction evidence.
5. Real cleanup, rollback apply, diary deletion, migration/import/export/backup/restore apply, or broad memory repair remains exact-approval/hard-gated.

## Next Minimal Gates

Recommended next safe write-side gates:

1. `MEMORY_WRITE_ROLLBACK_CLEANUP_BOUNDED_EVIDENCE_PLAN`: define fixture/temp-local evidence for rejected/preflight-rejected no-projection behavior and accepted/degraded partial cleanup accounting without real cleanup apply.
2. `MEMORY_WRITE_ROLLBACK_CLEANUP_FIXTURE_EVIDENCE`: prove the coordinated cleanup plan against synthetic stores or isolated temp roots only.
3. `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_PLAN`: define how supersede/tombstone/forget/proposal approval should represent correction and bad-memory remediation without destructive audit rewriting.
4. Candidate-provider source review for CM-0838 integration: decide how bounded duplicate summaries should be sourced without broad real-memory scan.
5. Separately exact-approved live write proof only after the rollback/cleanup and lifecycle posture is clear.

## Non-Claims

This review does not claim:

- `memory write reliable`
- default unattended write reliability
- broad `record_memory` reliability
- production write behavior
- real rollback cleanup
- long-run durability
- runtime readiness
- RC readiness
- production readiness
- V8 implementation
- VCP full parity

`RC_NOT_READY_BLOCKED` remains the controlling state.
