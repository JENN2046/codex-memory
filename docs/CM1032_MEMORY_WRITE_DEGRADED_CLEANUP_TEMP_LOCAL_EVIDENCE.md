# CM-1032 Memory Write Degraded Cleanup Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_WRITE_DEGRADED_CLEANUP_POSTURE_NOT_RELIABLE_NOT_READY`

Result label: `CM1032_MEMORY_WRITE_DEGRADED_CLEANUP_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1032 records isolated temp-local evidence for degraded write projection accounting and partial cleanup posture.

## Evidence

Test: `tests/memory-write-degraded-cleanup-temp-local-evidence.test.js`

Marker: `CM1032 write degraded cleanup temp local marker`

The test:

1. Opens an isolated temp-local harness with real local `DiaryStore`, `SqliteShadowStore`, `VectorIndexStore`, `AuditLogStore`, and `CandidateCacheStore` paths under one run-specific temp root.
2. Verifies all configured write, audit, vector, SQLite, and candidate-cache paths resolve under the temp root.
3. Writes one synthetic process record through `MemoryWriteService` while vector and chunk projection adapters fail with deterministic synthetic errors.
4. Verifies the accepted write is classified as `degraded` and reports vector/chunk failure reasons.
5. Verifies the SQLite record is present, vector/chunk projections are absent, and two reconcile tasks remain visible.
6. Adds one temp-local candidate-cache entry for the degraded write id.
7. Simulates partial cleanup by deleting the SQLite shadow row, attempting vector cleanup, and clearing the candidate-cache entry by memory id.
8. Verifies SQLite/vector/cache surfaces are clear while reconcile, diary, and write-audit residuals remain visible.
9. Removes the temp root at test teardown.

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
readiness claim = false
reliability claim = false
```

The only durable writes occur under the isolated temp root created by the test harness:

- one synthetic temp-local degraded accepted write
- one temp-local write-audit append
- one temp-local SQLite shadow projection
- two temp-local reconcile task records
- one temp-local candidate-cache entry
- simulated partial cleanup of temp-local SQLite/vector/cache surfaces

## Interpretation

CM-1032 proves one bounded temp-local fact: for a degraded accepted synthetic write where vector and chunk projections fail, the current write path keeps failure reasons and reconcile residuals visible, and partial cleanup can clear SQLite/vector/cache surfaces without hiding diary, audit, or reconcile residuals.

It strengthens CM-1031 by covering the degraded projection branch with actual isolated temp-local stores. It still does not implement a real rollback helper and does not prove complete cleanup safety.

It does not prove:

- broad write reliability
- default unattended `record_memory` reliability
- broad recall reliability
- write-to-recall reliability
- real cleanup safety
- real rollback safety
- diary cleanup
- audit deletion or rewrite
- reconcile cleanup safety
- long-run durability
- governance closure
- runtime readiness
- RC readiness
- production readiness
- release readiness
- VCP full parity

`memory write reliable`, `memory recall reliable`, rollback readiness, governance closure, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
