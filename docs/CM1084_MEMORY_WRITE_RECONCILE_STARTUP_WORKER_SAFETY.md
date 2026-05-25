# CM-1084 Memory Write Reconcile Startup Worker Safety

Status: `STARTUP_WORKER_SAFETY_REVIEW_ONLY_NOT_ENABLED_NOT_READY`

## Purpose

CM-1084 adds a local startup safety review helper for the internal write reconcile worker.

It does not start the worker, does not install or edit startup/watchdog behavior, does not change Codex or Claude configuration, and does not claim automatic degraded recovery, write reliability, or readiness.

## Review Contract

The helper accepts only:

```yaml
mode: startup_reconcile_worker_safety_review_only
source:
  - temp_local_app_initialization_fixture
  - temp_local_worker_status_fixture
```

Accepted input must provide a bounded worker status snapshot where:

```yaml
running: false
timerScheduled: false
tickInFlight: false
```

The helper blocks if any request attempts:

```yaml
requestedStartupEnablement: true
requestedRuntimeStart: true
requestedConfigChange: true
requestedWatchdogChange: true
requestedStartupTaskChange: true
requestedPublicMcpExpansion: true
```

It also blocks if the worker is already running, has a scheduled timer, or has a tick in flight.

## Sanitized Status Boundary

The worker status sanitizer keeps only bounded fields:

```yaml
running
timerScheduled
tickInFlight
runCount
intervalMs
limit
dryRun
maxRuns
lastResultSummary:
  success
  decision
  workerDecision
  dryRun
  limit
  scannedTaskCount
  replayedCount
  wouldReplayCount
  clearedCount
  failedCount
  skippedCount
  hasError
```

It omits raw errors, raw task results, memory IDs, payloads, stack traces, provider details, and secrets.

## Apply Gate

CM-1084 keeps startup apply gates closed:

```yaml
startupEnablementApproved: false
startupEnablementExecuted: false
configChangeApproved: false
configChangeExecuted: false
watchdogChangeApproved: false
watchdogChangeExecuted: false
publicMcpExpansionApproved: false
publicMcpExpansionExecuted: false
startupWorkerEnabled: false
runtimeWorkerStarted: false
readinessClaimed: false
reliabilityClaimed: false
```

## Non-Claims

CM-1084 does not prove:

- real startup worker safety
- long-running worker durability
- automatic reconcile recovery
- runtime retry persistence
- write reliability
- rollback readiness
- runtime readiness
- RC readiness
- production readiness

## Validation

Targeted validation:

```powershell
node --check .\src\core\MemoryWriteReconcileStartupSafetyPolicy.js
node --check .\tests\memory-write-reconcile-startup-safety-policy.test.js
node --test .\tests\memory-write-reconcile-startup-safety-policy.test.js
node --test .\tests\memory-write-reconcile-worker.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```
