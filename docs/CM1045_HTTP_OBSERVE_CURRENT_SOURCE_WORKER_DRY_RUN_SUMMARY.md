# CM-1045 HTTP Observe Current-Source Worker Dry-Run Summary

Status: `COMPLETED_VALIDATED_HTTP_OBSERVE_CURRENT_SOURCE_WORKER_DRY_RUN_SUMMARY_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Scope

CM-1045 adds a controlled test-only proof that `observe:http` can read a bounded `lastResultSummary` after an explicit internal write reconcile worker dry-run on a temporary current-source HTTP server.

This is a follow-up to CM-1044. CM-1044 proved a freshly started current-source server exposes the stopped worker status. CM-1045 proves the same current-source observe path also consumes a sanitized last-result summary after the test calls `app.services.memoryWriteReconcileWorker.runOnce({ dryRun: true, limit: 4 })` directly.

## Evidence

Changed test:

- `tests/http-observe-cli.test.js`

The new test:

- starts a temporary current-source `createStreamableHttpServer(...)` on ephemeral port `0`
- creates isolated runtime artifact paths under a temp directory
- seeds only the minimal runtime artifacts required by `observe:http`
- confirms the worker is not running before the dry-run
- calls the internal worker directly with `dryRun: true` and `limit: 4`
- verifies the direct dry-run result is `dry_run_completed` / `run_once_completed`
- points `observe:http` at the temporary current-source server
- verifies `writeReconcileWorkerHealthFieldAvailable=true`
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

Expected bounded values in this empty seeded temp runtime:

```text
success = true
decision = dry_run_completed
workerDecision = run_once_completed
dryRun = true
limit = 4
scannedTaskCount = 0
replayedCount = 0
wouldReplayCount = 0
clearedCount = 0
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
targeted http-observe CLI test: 19/19
adjacent HTTP observe/MCP/worker bundle: 54/54
full npm test: 2495/2495
```

## Boundary

This evidence is intentionally narrow:

```text
existing 7605 service changed = false
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

CM-1045 does not prove broad write reliability, default unattended `record_memory` reliability, write-to-recall reliability, automatic degraded recovery, startup reconcile safety, long-running worker durability, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
