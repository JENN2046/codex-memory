# CM-1050 Memory Write Reconcile Worker Stop-In-Flight Reschedule Guard

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_WORKER_STOP_INFLIGHT_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1050 adds unit-level evidence that the default-disabled internal write reconcile worker does not reschedule itself after `stop()` is called while a scheduled replay tick is still in flight.

This follows CM-1049. CM-1049 proved `maxRuns` is a hard local bound while residual failed tasks remain queued. CM-1050 proves an explicit operator stop during an in-flight scheduled tick is also a hard local bound: once the replay Promise resolves, the worker remains stopped and no timer is left behind.

## Evidence

Changed test:

- `tests/memory-write-reconcile-worker.test.js`

The new test:

- uses a manual scheduler and a delayed replay Promise
- starts the default-disabled internal worker with `start({ dryRun: false, limit: 5 })`
- flushes one scheduled tick and holds replay in flight
- calls `stop()` while `tickInFlight=true`
- verifies worker state becomes stopped with no scheduled timer and no active scheduler timers
- releases the delayed replay
- verifies the completed tick increments `runCount` to `1`
- verifies the worker remains stopped, `timerScheduled=false`, `tickInFlight=false`, and no new timer can be flushed
- verifies bounded status summary omits the raw synthetic memory id from the replay result payload

Expected values:

```text
scheduled worker start calls = 1
manual scheduler started ticks = 1
stop calls during in-flight replay = 1
replay calls after stop = 0
runCount after replay settles = 1
worker running after replay settles = false
worker timerScheduled after replay settles = false
manual scheduler active timers after replay settles = 0
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
targeted memory write reconcile worker test: 14/14
adjacent worker/service/write reliability/MCP regression bundle: 33/33
full npm test: 2500/2500
```

## Boundary

This evidence is intentionally narrow:

```text
worker source changed = false
unit-level scheduler/replay stub only = true
synthetic temp-local accepted writes = 0
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

CM-1050 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
