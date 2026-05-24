# CM-1035 Memory Write Reconcile Service Internal Idle

Status: `COMPLETED_VALIDATED_INTERNAL_WRITE_RECONCILE_SERVICE_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1035 adds a narrow internal `MemoryWriteReconcileService` for replaying queued write projection reconcile tasks.

The service is default-idle. It does not start a worker, does not run on application startup, and is not exposed as a public MCP tool.

## What Changed

- Added `src/core/MemoryWriteReconcileService.js`.
- Mounted `app.services.memoryWriteReconcileService` in `src/app.js`.
- Added `tests/memory-write-reconcile-service.test.js`.

The service supports bounded `replayPending({ limit, dryRun })` over the existing SQLite reconcile queue:

- `dryRun: true` reports tasks that would be replayed without mutating projections or clearing the queue.
- `storeKind=vector` replays with `vectorStore.upsertRecord(payload)`.
- `storeKind=chunks` replays with `chunkIndexingService.indexRecord(payload)`.
- `storeKind=sqlite` replays with `shadowStore.upsertRecord(payload)`.
- successful non-dry-run replay clears only the matching `memoryId + storeKind` queued task family.
- malformed payloads, missing `memoryId`, unsupported store kinds, and projection failures are reported as failures and remain queued.
- scan limit is bounded to `1..500`, defaulting to `50`.

## Evidence

The temp-local test creates one synthetic degraded write by using the real local write stack with deterministic vector and chunk projection failures.

Before replay:

- write result is accepted and degraded
- SQLite row and write audit are visible
- vector/chunk projections are absent
- reconcile queue contains vector and chunks tasks

During dry-run:

- both queued tasks report `would_replay`
- vector/chunk projections remain absent
- reconcile queue remains unchanged

During non-dry-run replay:

- vector and chunks tasks replay through healthy temp-local projection services
- vector entry and chunk rows become visible
- embedding-cache is populated
- reconcile count drops to zero

The test also verifies queued sqlite projection replay, malformed queued task retention, and that `app.callTool('memory_write_reconcile')` remains unknown.

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
automatic reconcile worker = false
startup reconcile execution = false
package/config/watchdog/startup change = false
real cleanup apply = false
real rollback apply = false
readiness claim = false
reliability claim = false
```

## Validation

Targeted validation:

```text
node --check src\core\MemoryWriteReconcileService.js
node --check src\app.js
node --check tests\memory-write-reconcile-service.test.js
node --test tests\memory-write-reconcile-service.test.js
```

Result:

```text
CM-1035 targeted test passed 5/5
full npm test passed 2483/2483
```

## Impact

CM-1035 moves CM-1034 from explicit ad hoc replay evidence to an internal bounded replay service.

It still does not prove broad write reliability, default unattended `record_memory` reliability, automatic degraded recovery, real cleanup safety, real rollback safety, governance closure, rollback readiness, runtime readiness, RC readiness, production readiness, release readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains.
