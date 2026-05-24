# CM-1036 Memory Write Reconcile Worker Internal Disabled

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_DISABLED_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1036 adds a narrow internal `MemoryWriteReconcileWorker` around the CM-1035 reconcile service.

The worker is default-disabled. Constructing the app does not start polling, does not run reconcile at startup, and does not expose a public MCP tool.

## What Changed

- Added `src/core/MemoryWriteReconcileWorker.js`.
- Mounted `app.services.memoryWriteReconcileWorker` in `src/app.js`.
- Stopped the worker during `app.close()`.
- Added `tests/memory-write-reconcile-worker.test.js`.

The worker supports:

- `runOnce(options)` for explicit internal replay through `MemoryWriteReconcileService.replayPending(...)`.
- `start(options)` for explicit bounded polling with `setTimeout`.
- `stop()` for clearing the pending timer.
- interval normalization from `100` ms to `600000` ms, defaulting to `60000` ms.
- optional `maxRuns` for bounded worker execution in tests or future controlled internal callers.

## Evidence

The app-mounted test verifies:

- `app.services.memoryWriteReconcileWorker` exists.
- `isRunning()` is `false` by default.
- public tool definitions remain exactly `memory_overview`, `record_memory`, and `search_memory`.
- `app.callTool('memory_write_reconcile_worker')` remains unknown.

The temp-local `runOnce` test creates one synthetic degraded write with deterministic vector/chunk projection failures, then calls the worker explicitly:

- before `runOnce`, the reconcile queue contains vector and chunks tasks.
- after `runOnce`, vector/chunk projections are replayed through healthy temp-local stores.
- reconcile count drops to zero.
- the worker remains stopped.

The scheduler test uses a manual injected scheduler:

- `start({ limit, dryRun, maxRuns })` schedules work but does not run immediately.
- the first flushed timer performs exactly one replay.
- `stop()` clears the pending next timer.
- no overlap or background timer is required for the test.

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
package/dependency change = false
real cleanup apply = false
real rollback apply = false
readiness claim = false
reliability claim = false
```

## Validation

Targeted validation:

```text
node --check src\core\MemoryWriteReconcileWorker.js
node --check src\app.js
node --check tests\memory-write-reconcile-worker.test.js
node --test tests\memory-write-reconcile-worker.test.js
```

Result:

```text
CM-1036 targeted test passed 4/4
degraded replay/service/write reliability/MCP adjacent regression bundle passed 25/25
app-surface regressions passed 27/27
full npm test passed 2487/2487
```

## Impact

CM-1036 moves the reconcile path from explicit service-only replay to an internal default-disabled worker candidate with bounded start/stop mechanics.

It still does not prove broad write reliability, default unattended `record_memory` reliability, automatic degraded recovery, startup reconcile safety, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains.
