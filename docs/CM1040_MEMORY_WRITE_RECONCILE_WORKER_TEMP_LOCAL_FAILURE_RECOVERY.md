# CM-1040 Memory Write Reconcile Worker Temp-Local Failure Recovery

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_TEMP_LOCAL_FAILURE_RECOVERY_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1040 adds isolated temp-local evidence that the default-disabled write reconcile worker keeps a failed replay task queued, then drains the same queued work after the projection path recovers.

This is not startup execution, runtime observe, automatic recovery, or readiness evidence.

## What Changed

- Extended `tests/memory-write-reconcile-worker.test.js`.
- Added a CM-1040 temp-local worker failure-retention and recovery test.

No runtime source file changed.

The test uses isolated temp-local stores:

- `DiaryStore`
- `SqliteShadowStore`
- `VectorIndexStore`
- `AuditLogStore`
- `ChunkIndexingService`

It writes one synthetic process record through `MemoryWriteService` while vector/chunk projections fail deterministically. The accepted degraded write leaves two reconcile tasks visible.

Then the test starts a first internal worker explicitly with a failing replay projection path:

```text
limit = 1
dryRun = false
maxRuns = 1
manual scheduler = true
```

After one manual tick:

- worker is stopped.
- timer is cleared.
- `runCount = 1`.
- last result summary has `success = false`.
- scanned task count is `1`.
- replayed count is `0`.
- cleared count is `0`.
- failed count is `1`.
- reconcile queue count remains `2`.
- vector count remains `0`.
- chunk count remains `0`.
- worker status does not expose the raw memory id.

The same temp-local queue is then consumed by a second explicitly started worker with healthy projection services:

```text
limit = 1
dryRun = false
maxRuns = 2
manual scheduler = true
```

After two manual ticks:

- worker is stopped.
- timer is cleared.
- `runCount = 2`.
- reconcile queue count is `0`.
- SQLite record count is `1`.
- vector count is `1`.
- chunk count is at least `1`.
- diary file remains visible.
- worker status does not expose the raw memory id.

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
public memory_write_reconcile_worker tool = false
worker starts by default = false
startup reconcile execution = false
watchdog/startup/config change = false
runtime observe execution = false
package/dependency change = false
real cleanup apply = false
real rollback apply = false
readiness claim = false
reliability claim = false
```

## Validation

Targeted validation:

```text
node --check tests\memory-write-reconcile-worker.test.js
node --test tests\memory-write-reconcile-worker.test.js
```

Result:

```text
CM-1040 targeted worker test passed 9/9
adjacent worker/service/write reliability/MCP regression bundle passed 28/28
full npm test passed 2492/2492
```

## Impact

CM-1040 strengthens the internal worker evidence from successful queue drain to failure-retention and later recovery of the same queued temp-local work.

It still does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, runtime observe safety, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains.
