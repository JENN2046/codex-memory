# CM-1039 Memory Write Reconcile Worker Temp-Local Queue Drain

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_TEMP_LOCAL_QUEUE_DRAIN_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1039 adds isolated temp-local evidence that the default-disabled write reconcile worker can drain multiple queued projection tasks across bounded explicit ticks.

This is not startup execution, runtime observe, automatic recovery, or readiness evidence.

## What Changed

- Extended `tests/memory-write-reconcile-worker.test.js`.
- Added a CM-1039 temp-local worker queue-drain test.

No runtime source file changed.

The new test uses isolated temp-local stores:

- `DiaryStore`
- `SqliteShadowStore`
- `VectorIndexStore`
- `AuditLogStore`
- `ChunkIndexingService`

It writes two synthetic process records through `MemoryWriteService` while vector/chunk projections fail deterministically. The two accepted degraded writes leave four reconcile tasks visible: vector and chunks for each write.

Then the test starts the internal worker explicitly with:

```text
limit = 1
dryRun = false
maxRuns = 4
manual scheduler = true
```

Four manual scheduler ticks replay one queued task per tick. After the fourth tick:

- worker is stopped.
- timer is cleared.
- `runCount = 4`.
- reconcile queue count is `0`.
- SQLite record count is `2`.
- vector count is `2`.
- chunk count is at least `2`.
- both diary files remain visible.
- worker status does not expose raw memory ids.

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
CM-1039 targeted worker test passed 8/8
adjacent worker/service/write reliability/MCP regression bundle passed 27/27
full npm test passed 2491/2491
```

## Impact

CM-1039 strengthens the internal worker evidence from mock scheduler loop behavior to isolated temp-local multi-task queue drain behavior.

It still does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, runtime observe safety, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains.
