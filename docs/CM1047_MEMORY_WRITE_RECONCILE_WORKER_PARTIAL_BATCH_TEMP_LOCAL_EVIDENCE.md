# CM-1047 Memory Write Reconcile Worker Partial Batch Temp-Local Evidence

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_PARTIAL_BATCH_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1047 adds isolated temp-local evidence that a bounded explicit write reconcile worker replay preserves remaining queued projection tasks when the run limit is smaller than the queue size.

This follows CM-1039 through CM-1046. Those slices proved full queue drain, failure retention, close/reopen recovery, and HTTP observe summaries. CM-1047 closes the smaller batch-boundary gap: a successful bounded replay must not imply the entire reconcile queue has been drained.

## Evidence

Changed test:

- `tests/memory-write-reconcile-worker.test.js`

The new test:

- creates an isolated temp-local root
- uses real local `DiaryStore`, `SqliteShadowStore`, `VectorIndexStore`, `AuditLogStore`, and `ChunkIndexingService`
- creates two synthetic accepted writes whose vector/chunk projections fail initially
- verifies the temp-local shadow store contains two records and four queued reconcile tasks
- explicitly calls internal worker `runOnce({ dryRun: false, limit: 2 })`
- verifies only two queued tasks are scanned, replayed, and cleared
- verifies two queued tasks remain after the first bounded run
- verifies the worker remains stopped with no scheduled timer and `runCount=0`
- verifies the worker status summary contains bounded counters only
- verifies status output contains no raw memory ids
- explicitly calls a second `runOnce({ dryRun: false, limit: 2 })`
- verifies the remaining two tasks drain and reconcile count returns to `0`
- verifies vector and chunk projections are restored for both records

First bounded replay expected values:

```text
limit = 2
scannedTaskCount = 2
replayedCount = 2
clearedCount = 2
failedCount = 0
remaining reconcileCount = 2
worker running = false
worker timerScheduled = false
worker runCount = 0
raw memory ids exposed = false
```

Final bounded replay expected values:

```text
limit = 2
scannedTaskCount = 2
replayedCount = 2
clearedCount = 2
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
targeted memory write reconcile worker test: 11/11
adjacent worker/service/write reliability/MCP regression bundle: 30/30
full npm test: 2497/2497
```

## Boundary

This evidence is intentionally narrow:

```text
worker source changed = false
synthetic temp-local accepted writes = 2
synthetic temp-local queued replay tasks = 4
explicit internal worker runOnce calls = 2
first run limit = 2
first run remaining reconcile tasks = 2
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

CM-1047 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
