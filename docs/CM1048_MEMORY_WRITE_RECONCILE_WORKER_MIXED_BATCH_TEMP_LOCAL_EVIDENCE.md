# CM-1048 Memory Write Reconcile Worker Mixed Batch Temp-Local Evidence

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_MIXED_BATCH_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1048 adds isolated temp-local evidence that a bounded explicit write reconcile worker replay can safely handle a mixed-result batch: successful replayed tasks are cleared, failed tasks remain queued, and unscanned tasks remain queued.

This follows CM-1047. CM-1047 proved a successful partial batch preserves unscanned work. CM-1048 proves a failed item inside the scanned batch does not cause over-clearing of failed or unscanned work.

## Evidence

Changed test:

- `tests/memory-write-reconcile-worker.test.js`

The new test:

- creates an isolated temp-local root
- uses real local `DiaryStore`, `SqliteShadowStore`, `VectorIndexStore`, `AuditLogStore`, and `ChunkIndexingService`
- creates two synthetic accepted writes whose initial vector/chunk projections fail
- clears and re-enqueues four deterministic temp-local replay tasks with explicit `createdAt` ordering
- verifies the queue order is first record vector, first record chunks, second record vector, second record chunks
- runs an explicit internal worker with `runOnce({ dryRun: false, limit: 2 })`
- uses a healthy vector projection and failing chunk projection for that first run
- verifies the first run replays and clears the vector task, fails and retains the chunk task, and leaves the second record tasks unscanned
- verifies `completed_with_failures`, scanned `2`, replayed `1`, cleared `1`, failed `1`
- verifies reconcile count remains `3`
- verifies worker status remains stopped/no timer/runCount `0`
- verifies status output contains no raw memory ids or raw projection error text
- runs a second explicit healthy worker `runOnce({ dryRun: false, limit: 3 })`
- verifies the retained failed task plus the two unscanned tasks drain
- verifies final reconcile count is `0`, vector count is `2`, and chunk count is at least `2`

First mixed replay expected values:

```text
limit = 2
scannedTaskCount = 2
replayedCount = 1
clearedCount = 1
failedCount = 1
remaining reconcileCount = 3
worker running = false
worker timerScheduled = false
worker runCount = 0
raw memory ids exposed = false
raw projection error exposed = false
```

Final recovery replay expected values:

```text
limit = 3
scannedTaskCount = 3
replayedCount = 3
clearedCount = 3
failedCount = 0
remaining reconcileCount = 0
vectorCount = 2
chunkCount >= 2
raw memory ids exposed = false
```

## Validation

Passed:

```powershell
node --check .\tests\memory-write-reconcile-worker.test.js
node --test .\tests\memory-write-reconcile-worker.test.js
node --test .\tests\memory-write-reconcile-worker.test.js .\tests\memory-write-reconcile-service.test.js .\tests\memory-write-degraded-reconcile-replay-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js .\tests\mcp-contract.test.js
npm test
```

Observed counts:

```text
targeted memory write reconcile worker test: 12/12
adjacent worker/service/write reliability/MCP regression bundle: 31/31
full npm test: 2498/2498
```

## Boundary

This evidence is intentionally narrow:

```text
worker source changed = false
synthetic temp-local accepted writes = 2
synthetic temp-local queued replay tasks = 4
explicit internal worker runOnce calls = 2
first run limit = 2
first run replayed tasks = 1
first run failed tasks = 1
first run remaining reconcile tasks = 3
second run remaining reconcile tasks = 0
true live record_memory calls = 0
true live search_memory calls = 0
real memory reads = 0
real memory writes = 0
provider/API calls = 0
public MCP expansion = false
public memory_write_reconcile_worker tool = false
worker starts by default = false
scheduled worker loop started = false
startup reconcile execution = false
watchdog/startup/config change = false
package/dependency change = false
readiness claim = false
reliability claim = false
```

CM-1048 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
