# CM-1054 Memory Write Reconcile Worker Already-Running Start Guard

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_ALREADY_RUNNING_START_GUARD_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1054 closes a narrow operator-facing status and idempotency gap in the default-disabled internal write reconcile worker.

When `start()` is called while the worker is already running, it must report the active run's bounded options and must not treat the second call as a reconfiguration or second scheduler start.

Before this slice, the `already_running` return did not include `maxRuns`, even though normal `started`, failed-start status, and `getStatus()` do expose it.

## Change

- Updated `src/core/MemoryWriteReconcileWorker.js`.
- `start()` now includes current `maxRuns` in the `already_running` return object.
- Updated `tests/memory-write-reconcile-worker.test.js`.

## Test Evidence

Added:

- `CM-1054 worker already-running start reports active options without rescheduling`

The test verifies:

- first `start({ dryRun: false, limit: 6, maxRuns: 2 })` schedules one timer
- second `start({ dryRun: true, limit: 99, maxRuns: 9, intervalMs: 500 })` returns `already_running`
- the second call reports the active options: `intervalMs=250`, `limit=6`, `dryRun=false`, `maxRuns=2`
- the second call does not reset `runCount`
- the second call does not add another scheduled timer
- the first scheduled tick uses the original active options
- after one tick the worker remains running with one next timer because `maxRuns=2`
- status keeps the active options and omits raw synthetic memory ids

## Validation

- `node --check .\src\core\MemoryWriteReconcileWorker.js` passed.
- `node --check .\tests\memory-write-reconcile-worker.test.js` passed.
- `node --test .\tests\memory-write-reconcile-worker.test.js` passed `18/18`.
- Adjacent worker/service/write reliability/MCP regression bundle passed `37/37`.
- Full `npm test` passed `2504/2504`.

## Boundary

```text
worker source changed = true
unit-level scheduler/replay stub only = true
synthetic temp-local accepted writes = 0
scheduled worker start calls = 2
already_running return = true
already_running returns active maxRuns = true
second start changes active options = false
second start schedules extra timer = false
replay calls after one tick = 1
replay uses original active options = true
raw memory ids exposed = false
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

## Result

CM-1054 is completed and validated as an internal already-running start idempotency and status guard.

It does not prove broad write reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, runtime readiness, rollback readiness, governance closure, RC readiness, production readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
