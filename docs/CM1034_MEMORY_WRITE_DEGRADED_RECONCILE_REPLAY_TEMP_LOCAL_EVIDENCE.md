# CM-1034 Memory Write Degraded Reconcile Replay Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_WRITE_DEGRADED_RECONCILE_REPLAY_NOT_RELIABLE_NOT_READY`

Result label: `CM1034_MEMORY_WRITE_DEGRADED_RECONCILE_REPLAY_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1034 records isolated temp-local evidence that degraded write reconcile payloads can be replayed into healthy projection stores.

## Evidence

Test: `tests/memory-write-degraded-reconcile-replay-temp-local-evidence.test.js`

Marker: `CM1034 degraded reconcile replay temp local marker`

The test:

1. Opens an isolated temp-local harness with real local `DiaryStore`, `SqliteShadowStore`, `VectorIndexStore`, and `AuditLogStore` paths under one run-specific temp root.
2. Verifies all configured write, audit, vector, and SQLite paths resolve under the temp root.
3. Writes one synthetic process record through `MemoryWriteService` while vector and chunk projection adapters fail with deterministic synthetic errors.
4. Verifies the accepted write is classified as `degraded` and reports vector/chunk failure reasons.
5. Verifies the SQLite record and write audit are visible, vector/chunk projections are absent, and two reconcile tasks remain visible.
6. Reads the temp-local reconcile queue and verifies each task carries the expected memory id, store kind, reason, scope fields, and payload.
7. Replays the vector reconcile payload into a healthy temp-local `VectorIndexStore`, then clears only the vector reconcile task.
8. Replays the chunk reconcile payload through a healthy temp-local `ChunkIndexingService`, then clears only the chunks reconcile task.
9. Verifies SQLite record/chunks, vector entry, embedding-cache, diary file, and write-audit entry remain visible while reconcile count drops to zero.
10. Removes the temp root at test teardown.

## Boundary

```text
true live record_memory calls = 0
true live search_memory calls = 0
real memory reads = 0
real memory writes = 0
real .jsonl reads = 0
raw real memory output = 0
provider/API calls = 0
public MCP expansion = false
package/config/watchdog/startup change = false
real cleanup apply = false
real rollback apply = false
runtime reconcile worker implemented = false
readiness claim = false
reliability claim = false
```

The only durable writes occur under the isolated temp root created by the test harness:

- one synthetic temp-local degraded accepted write
- one temp-local write-audit append
- one temp-local SQLite shadow projection
- two temp-local reconcile task records
- one replayed temp-local vector projection
- replayed temp-local chunk projections
- local embedding-cache entries
- clearing the two temp-local reconcile task records

## Interpretation

CM-1034 proves one bounded temp-local fact: for a degraded accepted synthetic write where vector and chunk projections initially fail, the queued reconcile payloads are sufficient to replay vector/chunk projections into healthy temp-local stores and clear those reconcile tasks explicitly.

It strengthens CM-1032 by covering the replay side of the degraded projection branch. It still does not implement an automatic reconcile worker and does not prove real degraded recovery safety.

It does not prove:

- broad write reliability
- default unattended `record_memory` reliability
- broad recall reliability
- write-to-recall reliability
- real cleanup safety
- real rollback safety
- automatic reconcile processing
- real degraded projection recovery
- reconcile cleanup safety
- multi-run or long-horizon durability
- governance closure
- runtime readiness
- RC readiness
- production readiness
- release readiness
- VCP full parity

`memory write reliable`, `memory recall reliable`, degraded recovery, long-run durability, rollback readiness, governance closure, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
