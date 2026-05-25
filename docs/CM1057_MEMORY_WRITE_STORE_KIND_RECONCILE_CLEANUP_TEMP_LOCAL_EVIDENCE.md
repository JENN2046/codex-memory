# CM-1057 Memory Write Store-Kind Reconcile Cleanup Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_WRITE_STORE_KIND_RECONCILE_CLEANUP_POSTURE_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1057 closes a narrow cleanup precision gap after CM-1056.

CM-1056 proved that explicit `clearReconcileTasks(memoryId)` can clear all degraded residual reconcile tasks for one synthetic temp-local memory id. CM-1057 adds the store-kind scoped proof: `clearReconcileTasks(memoryId, storeKind)` can remove one residual kind without over-clearing the other kind.

## Change

- Updated `tests/memory-write-degraded-cleanup-temp-local-evidence.test.js`.
- Added a third isolated temp-local test using the existing degraded cleanup harness.
- No runtime source, public MCP contract, package, config, watchdog, startup, provider, real cleanup, real rollback, or true memory store change was made.

## Test Evidence

Added:

- `CM-1057 degraded temp-local cleanup can clear reconcile residuals by store kind without over-clearing`

The test verifies:

- a synthetic temp-local write is accepted with degraded shadow status
- the degraded write queues exactly two reconcile residual tasks
- queued task kinds are `chunks` and `vector`
- partial projection cleanup removes SQLite record, vector projection, and candidate cache entry
- partial projection cleanup still leaves `reconcileCount=2`
- explicit `clearReconcileTasks(memoryId, 'vector')` reduces `reconcileCount` to `1`
- the remaining queued task is still `chunks`
- repeating vector cleanup does not remove the remaining `chunks` task
- explicit `clearReconcileTasks(memoryId, 'chunks')` clears the final residual task
- no vector or candidate-cache projection is resurrected
- the diary file and write-audit file remain visible after scoped cleanup
- the temp root is removed at the end of the test

## Validation

- `node --check .\tests\memory-write-degraded-cleanup-temp-local-evidence.test.js` passed.
- `node --test .\tests\memory-write-degraded-cleanup-temp-local-evidence.test.js` passed `3/3`.
- Adjacent write cleanup/reconcile/MCP regression bundle passed `43/43`.
- Full `npm test` passed `2507/2507`.

## Boundary

```text
test-only change = true
temp-local degraded accepted writes = 1
temp-local reconcile tasks before cleanup = 2
temp-local reconcile tasks after projection cleanup = 2
store-kind vector cleanup calls = 2
temp-local reconcile tasks after vector cleanup = 1
remaining reconcile task after vector cleanup = chunks
store-kind chunks cleanup calls = 1
temp-local reconcile tasks after chunks cleanup = 0
diary evidence retained after scoped cleanup = true
audit evidence retained after scoped cleanup = true
vector projection resurrected = false
candidate cache projection resurrected = false
true live record_memory calls = 0
true live search_memory calls = 0
real memory reads = 0
real memory writes = 0
real jsonl reads = 0
provider/API calls = 0
public MCP expansion = false
public cleanup tool = false
real cleanup apply = false
real rollback apply = false
watchdog/startup/config change = false
package/dependency change = false
readiness claim = false
reliability claim = false
```

## Result

CM-1057 is completed and validated as fixture-controlled temp-local cleanup precision evidence.

It proves that the existing local shadow-store primitive can explicitly remove one degraded reconcile residual kind under an isolated temp root without over-clearing a different residual kind, while append-only diary and audit evidence remain visible.

It does not prove broad write reliability, default unattended cleanup, automatic degraded recovery, real cleanup safety, real rollback safety, rollback readiness, runtime readiness, governance closure, RC readiness, production readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
