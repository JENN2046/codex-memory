# CM-1041 Memory Write Reconcile Worker Temp-Local Reopen Recovery

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_TEMP_LOCAL_REOPEN_RECOVERY_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1041 adds isolated temp-local evidence that queued write projection reconcile tasks can survive a SQLite shadow store close/reopen boundary and then be drained by a new explicit internal worker.

This is a test-only evidence slice. It does not change runtime source, public MCP tools, startup behavior, watchdog behavior, config, dependencies, or default worker activation.

## Evidence

Updated `tests/memory-write-reconcile-worker.test.js` with `CM-1041 worker drains persisted temp-local reconcile queue after shadow store reopen`.

The test uses an isolated temp root with real local:

- `DiaryStore`
- `SqliteShadowStore`
- `VectorIndexStore`
- `AuditLogStore`
- `ChunkIndexingService`
- injected manual schedulers

Flow:

1. Create one synthetic degraded accepted write with deterministic vector/chunk projection failures.
2. Verify the temp-local shadow store contains one record and two queued reconcile tasks, while vector/chunk projections are absent.
3. Run one explicit failing worker tick with `limit=1`, `dryRun=false`, and `maxRuns=1`.
4. Verify the failed tick scans one queued task, clears none, fails one, and leaves the queue count at `2`.
5. Close the original SQLite shadow store.
6. Reopen a fresh `SqliteShadowStore` instance on the same temp-local path.
7. Verify the reopened store still sees the record, both queued reconcile tasks, and no vector/chunk projections.
8. Start a new explicit worker with healthy projection services, `limit=1`, `dryRun=false`, and `maxRuns=2`.
9. Verify two manual ticks drain the persisted queue, restore vector/chunk projections, keep the diary file visible, and leave worker status free of raw memory ids.

## Validation

Passed:

- `node --check .\tests\memory-write-reconcile-worker.test.js`
- `node --test .\tests\memory-write-reconcile-worker.test.js` (`10/10`)
- adjacent worker/service/write reliability/MCP regression bundle (`29/29`)
- `npm test` (`2493/2493`)

## Boundary

```text
true live record_memory calls = 0
true live search_memory calls = 0
provider/API calls = 0
real memory reads = 0
real memory writes = 0
real .jsonl reads = 0
raw real memory output = 0
public MCP expansion = false
runtime source changed = false
worker starts by default = false
startup reconcile execution = false
runtime observe execution = false
watchdog/startup/config change = false
package/dependency change = false
real cleanup apply = false
real rollback apply = false
readiness claim = false
reliability claim = false
```

## Result

CM-1041 strengthens CM-1040 by proving the failed temp-local reconcile queue is not only retained in-memory during the same store instance, but remains visible after shadow store close/reopen and can be drained by a new explicit internal worker.

It does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, runtime observe safety, long-horizon runtime durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
