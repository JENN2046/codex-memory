# CM-1049 Memory Write Reconcile Worker MaxRuns Residual Queue Temp-Local Evidence

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_MAXRUNS_RESIDUAL_QUEUE_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1049 adds isolated temp-local evidence that the default-disabled internal write reconcile worker stops at `maxRuns` even when failed replay tasks keep the queue non-empty.

This follows CM-1048. CM-1048 proved a mixed-result bounded run clears successful work and retains failed/unscanned work. CM-1049 proves the scheduled worker loop remains bounded under the same residual-queue pressure and does not continue scheduling itself after `maxRuns`.

## Evidence

Changed test:

- `tests/memory-write-reconcile-worker.test.js`

The new test:

- creates an isolated temp-local root
- uses real local `DiaryStore`, `SqliteShadowStore`, `VectorIndexStore`, `AuditLogStore`, and `ChunkIndexingService`
- creates two synthetic accepted writes whose initial vector/chunk projections fail
- clears and re-enqueues four deterministic temp-local replay tasks with explicit `createdAt` ordering
- starts the default-disabled internal worker with a manual scheduler: `start({ dryRun: false, limit: 2, maxRuns: 2 })`
- uses healthy vector replay and failing chunk replay during the scheduled ticks
- verifies the first tick replays/clears one vector task, fails/retains one chunk task, keeps the worker running, and schedules the next tick
- verifies the second tick replays/clears the second vector task, fails/retains a chunk task, reaches `runCount=2`, and stops because `maxRuns=2`
- verifies no timer remains scheduled after maxRuns stops the worker
- verifies reconcile count remains `2`, proving residual failed chunk tasks are still visible
- verifies status output contains no raw memory ids or raw projection error text
- runs a separate explicit healthy worker `runOnce({ dryRun: false, limit: 2 })`
- verifies the remaining two chunk tasks drain and reconcile count returns to `0`

Scheduled maxRuns expected values:

```text
maxRuns = 2
limit = 2
runCount = 2
worker running = false
worker timerScheduled = false
manual scheduler active timers = 0
last scannedTaskCount = 2
last replayedCount = 1
last clearedCount = 1
last failedCount = 1
remaining reconcileCount = 2
raw memory ids exposed = false
raw projection error exposed = false
```

Final recovery replay expected values:

```text
limit = 2
scannedTaskCount = 2
replayedCount = 2
clearedCount = 2
failedCount = 0
remaining reconcileCount = 0
chunkCount >= 2
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
targeted memory write reconcile worker test: 13/13
adjacent worker/service/write reliability/MCP regression bundle: 32/32
full npm test: 2499/2499
```

## Boundary

This evidence is intentionally narrow:

```text
worker source changed = false
synthetic temp-local accepted writes = 2
synthetic temp-local queued replay tasks = 4
scheduled worker start calls = 1
manual scheduler ticks = 2
scheduled worker maxRuns = 2
residual reconcile tasks after maxRuns = 2
explicit recovery worker runOnce calls = 1
true live record_memory calls = 0
true live search_memory calls = 0
real memory reads = 0
real memory writes = 0
provider/API calls = 0
public MCP expansion = false
public memory_write_reconcile_worker tool = false
worker starts by default = false
startup reconcile execution = false
watchdog/startup/config change = false
package/dependency change = false
readiness claim = false
reliability claim = false
```

CM-1049 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
