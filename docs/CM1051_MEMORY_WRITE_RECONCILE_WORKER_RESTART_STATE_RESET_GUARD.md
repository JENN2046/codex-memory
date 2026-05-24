# CM-1051 Memory Write Reconcile Worker Restart State Reset Guard

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_RESTART_STATE_RESET_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1051 adds a narrow source/test guard for the default-disabled internal write reconcile worker restart path.

CM-1050 proved explicit `stop()` during an in-flight scheduled tick prevents post-replay rescheduling. CM-1051 closes the next status hygiene gap: when a stopped worker is explicitly started again, the new run must not expose the previous run's `lastResultSummary` before its first scheduled tick executes.

## Change

Changed source:

- `src/core/MemoryWriteReconcileWorker.js`

Changed test:

- `tests/memory-write-reconcile-worker.test.js`

The source change is intentionally small:

```text
start() now clears lastResult before scheduling a new worker run.
```

The new test:

- runs a first explicit scheduled worker cycle with `start({ dryRun: false, limit: 3, maxRuns: 1 })`
- verifies the first cycle completes with a bounded `lastResultSummary`
- starts the stopped worker again with `start({ dryRun: true, limit: 8, maxRuns: 1 })`
- verifies the restarted pre-tick status has `runCount=0`, `timerScheduled=true`, new options, and `lastResultSummary=null`
- flushes the second tick
- verifies the second run uses the new options and replaces the summary with the second bounded result
- verifies raw synthetic memory ids are not exposed through status

Expected values:

```text
worker source changed = true
scheduled worker start calls = 2
first run dryRun = false
first run limit = 3
first run maxRuns = 1
first runCount after first tick = 1
restart pre-tick runCount = 0
restart pre-tick lastResultSummary = null
restart pre-tick timerScheduled = true
second run dryRun = true
second run limit = 8
second run maxRuns = 1
second runCount after second tick = 1
raw memory ids exposed = false
```

## Validation

Passed:

```powershell
node --check .\src\core\MemoryWriteReconcileWorker.js
node --check .\tests\memory-write-reconcile-worker.test.js
node --test .\tests\memory-write-reconcile-worker.test.js
node --test .\tests\memory-write-reconcile-worker.test.js .\tests\memory-write-reconcile-service.test.js .\tests\memory-write-degraded-reconcile-replay-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js .\tests\mcp-contract.test.js
npm test
```

Observed counts:

```text
targeted memory write reconcile worker test: 15/15
adjacent worker/service/write reliability/MCP regression bundle: 34/34
full npm test: 2501/2501
```

## Boundary

This evidence is intentionally narrow:

```text
worker source changed = true
public API changed = false
public MCP expansion = false
public memory_write_reconcile_worker tool = false
unit-level scheduler/replay stub only = true
synthetic temp-local accepted writes = 0
true live record_memory calls = 0
true live search_memory calls = 0
real memory reads = 0
real memory writes = 0
provider/API calls = 0
worker starts by default = false
startup reconcile execution = false
watchdog/startup/config change = false
package/dependency change = false
readiness claim = false
reliability claim = false
```

CM-1051 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
