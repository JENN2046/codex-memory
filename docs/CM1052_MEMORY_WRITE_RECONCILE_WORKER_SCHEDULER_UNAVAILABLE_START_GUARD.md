# CM-1052 Memory Write Reconcile Worker Scheduler-Unavailable Start Guard

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_SCHEDULER_UNAVAILABLE_START_GUARD_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1052 closes a narrow operator-facing status mismatch in the default-disabled internal write reconcile worker.

Before this slice, `MemoryWriteReconcileWorker.scheduleNext()` correctly failed closed when the injected scheduler did not provide `setTimeout`, setting `lastResult.decision = worker_scheduler_unavailable` and `running = false`. However, `start()` still returned `decision = started` and `running = true` after that fail-closed path.

CM-1052 makes the `start()` return value match the real worker state.

## Change

- Updated `src/core/MemoryWriteReconcileWorker.js`.
- After `scheduleNext()`, `start()` now checks whether scheduling failed and `this.running` is false.
- On that path, `start()` returns:
  - `decision: start_failed`
  - `running: false`
  - bounded options
  - `lastResultSummary: summarizeResult(this.lastResult)`
- The returned summary is sanitized and does not expose the raw scheduler error string.

## Test Evidence

Updated `tests/memory-write-reconcile-worker.test.js` with:

- `CM-1052 worker start reports scheduler unavailable fail-closed state`

The test verifies:

- the worker is built with a scheduler object that has no `setTimeout`
- `start({ dryRun: true, limit: 9, maxRuns: 2 })` returns `start_failed`
- returned `running` is false
- returned options match the attempted start options
- returned `lastResultSummary` reports `worker_scheduler_unavailable` and `schedule_failed`
- the bounded summary has `hasError = true`
- the bounded summary does not expose raw `error`
- the returned object does not include the raw scheduler error string
- `worker.isRunning()` is false
- `getStatus()` reports stopped/no timer/no in-flight/runCount `0`
- `getStatus().lastResultSummary` matches the returned summary
- replay is not called through the scheduler-unavailable path

## Validation

- `node --check .\src\core\MemoryWriteReconcileWorker.js` passed.
- `node --check .\tests\memory-write-reconcile-worker.test.js` passed.
- `node --test .\tests\memory-write-reconcile-worker.test.js` passed `16/16`.
- Adjacent worker/service/write reliability/MCP regression bundle passed `35/35`.
- Full `npm test` passed `2502/2502`.

## Boundary

```text
worker source changed = true
unit-level scheduler/replay stub only = true
synthetic temp-local accepted writes = 0
scheduled worker start calls = 1
scheduler.setTimeout unavailable = true
start return decision = start_failed
start return running = false
status running = false
timer scheduled = false
replay calls = 0
raw scheduler error exposed = false
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

CM-1052 is completed and validated as an internal worker start-return status guard.

It does not prove broad write reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, runtime readiness, rollback readiness, governance closure, RC readiness, production readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
