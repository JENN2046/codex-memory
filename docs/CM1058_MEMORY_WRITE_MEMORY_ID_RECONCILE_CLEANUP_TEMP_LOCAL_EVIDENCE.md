# CM-1058 Memory Write Memory-Id Reconcile Cleanup Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_WRITE_MEMORY_ID_RECONCILE_CLEANUP_ISOLATION_NOT_RELIABLE_NOT_READY`

Date: 2026-05-25

## Purpose

CM-1058 closes a narrow cleanup isolation gap after CM-1057.

CM-1057 proved store-kind scoped cleanup does not over-clear another residual kind for the same memory id. CM-1058 adds the memory-id scoped proof: `clearReconcileTasks(memoryId)` can remove residuals for one synthetic temp-local memory id without clearing residuals for another synthetic temp-local memory id.

## Change

- Updated `tests/memory-write-degraded-cleanup-temp-local-evidence.test.js`.
- Added a fourth isolated temp-local test using the existing degraded cleanup harness.
- No runtime source, public MCP contract, package, config, watchdog, startup, provider, real cleanup, real rollback, or true memory store change was made.

## Test Evidence

Added:

- `CM-1058 degraded temp-local cleanup clears one memory id without over-clearing another memory id`

The test verifies:

- two synthetic temp-local writes are accepted with degraded shadow status
- each degraded write queues exactly two reconcile residual tasks
- each queued task pair contains `chunks` and `vector`
- partial projection cleanup for the first memory id leaves the second SQLite record visible
- partial projection cleanup still leaves `reconcileCount=4`
- explicit `clearReconcileTasks(firstMemoryId)` reduces `reconcileCount` to `2`
- the remaining queued tasks belong only to the second memory id
- repeating cleanup for the first memory id does not remove the second memory id residuals
- explicit `clearReconcileTasks(secondMemoryId)` clears the final residual tasks
- both diary files and the write-audit file remain visible after scoped cleanup
- the temp root is removed at the end of the test

## Validation

- `node --check .\tests\memory-write-degraded-cleanup-temp-local-evidence.test.js` passed.
- `node --test .\tests\memory-write-degraded-cleanup-temp-local-evidence.test.js` passed `4/4`.
- Adjacent write cleanup/reconcile/MCP regression bundle passed `44/44`.
- Full `npm test` passed `2508/2508`.

## Boundary

```text
test-only change = true
temp-local degraded accepted writes = 2
temp-local reconcile tasks before cleanup = 4
first memory-id projection cleanup record count after = 1
temp-local reconcile tasks after first projection cleanup = 4
temp-local reconcile tasks after first memory-id cleanup = 2
remaining reconcile memory id after first cleanup = second memory id
temp-local reconcile tasks after repeated first memory-id cleanup = 2
temp-local reconcile tasks after second memory-id cleanup = 0
diary evidence retained after scoped cleanup = true
audit evidence retained after scoped cleanup = true
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

CM-1058 is completed and validated as fixture-controlled temp-local cleanup isolation evidence.

It proves that the existing local shadow-store primitive can explicitly remove degraded reconcile residuals for one synthetic temp-local memory id without over-clearing another synthetic memory id, while append-only diary and audit evidence remain visible.

It does not prove broad write reliability, default unattended cleanup, automatic degraded recovery, real cleanup safety, real rollback safety, rollback readiness, runtime readiness, governance closure, RC readiness, production readiness, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains unchanged.
