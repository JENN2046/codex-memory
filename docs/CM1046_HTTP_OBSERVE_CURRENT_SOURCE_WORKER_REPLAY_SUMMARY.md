# CM-1046 HTTP Observe Current-Source Worker Replay Summary

Status: `COMPLETED_VALIDATED_HTTP_OBSERVE_CURRENT_SOURCE_WORKER_REPLAY_SUMMARY_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1046 adds controlled test-runtime evidence that `observe:http` can read a bounded non-dry-run `lastResultSummary` after an explicit internal write reconcile worker replay on a temporary current-source HTTP server.

This follows CM-1045. CM-1045 proved bounded dry-run summary observation. CM-1046 proves the same current-source observe path also consumes sanitized replay counters after a synthetic temp-local queued replay is executed explicitly.

## Evidence

Changed test:

- `tests/http-observe-cli.test.js`

The new test:

- starts a temporary current-source `createStreamableHttpServer(...)` on ephemeral port `0`
- creates isolated runtime artifact paths under a temp directory
- writes one synthetic temp-local process record through `app.services.writeService.record(...)` with explicit Codex execution context
- manually enqueues two temp-local reconcile tasks for the written record: `vector` and `chunks`
- confirms the temp-local reconcile queue count is `2`
- calls the internal worker directly with `runOnce({ dryRun: false, limit: 2 })`
- verifies the direct replay result is `completed` / `run_once_completed`
- verifies `scannedTaskCount=2`, `replayedCount=2`, `clearedCount=2`, `failedCount=0`
- verifies the temp-local reconcile queue count returns to `0`
- points `observe:http` at the temporary current-source server
- verifies worker status remains available/stopped/no timer/no in-flight
- verifies `writeReconcileWorkerRunCount=0`, because `runOnce(...)` is explicit and does not start the scheduled worker loop
- verifies `lastResultSummary` contains only bounded counters and status flags
- verifies `lastResultSummary` includes no raw `memoryId`
- verifies the worker is still not running after observe

Bounded last-result summary keys:

```text
clearedCount
decision
dryRun
failedCount
hasError
limit
replayedCount
scannedTaskCount
skippedCount
success
workerDecision
wouldReplayCount
```

Expected bounded values:

```text
success = true
decision = completed
workerDecision = run_once_completed
dryRun = false
limit = 2
scannedTaskCount = 2
replayedCount = 2
wouldReplayCount = 0
clearedCount = 2
failedCount = 0
skippedCount = 0
hasError = false
```

## Validation

Passed:

```powershell
node --check .\tests\http-observe-cli.test.js
node --test .\tests\http-observe-cli.test.js
node --test .\tests\http-observe-cli.test.js .\tests\mcp-http.test.js .\tests\mcp-contract.test.js .\tests\memory-write-reconcile-worker.test.js
npm test
```

Observed counts:

```text
targeted http-observe CLI test: 20/20
adjacent HTTP observe/MCP/worker bundle: 55/55
full npm test: 2496/2496
```

## Boundary

This evidence is intentionally narrow:

```text
existing 7605 service changed = false
synthetic temp-local accepted writes = 1
synthetic temp-local queued replay tasks = 2
true live record_memory calls = 0
true live search_memory calls = 0
provider/API calls = 0
public MCP expansion = false
public memory_write_reconcile_worker tool = false
worker starts by health = false
worker starts by observe = false
worker starts by default = false
scheduled worker loop started = false
startup reconcile execution = false
watchdog/startup/config change = false
package/dependency change = false
readiness claim = false
reliability claim = false
```

CM-1046 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
