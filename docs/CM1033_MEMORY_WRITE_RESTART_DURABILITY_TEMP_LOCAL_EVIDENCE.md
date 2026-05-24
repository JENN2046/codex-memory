# CM-1033 Memory Write Restart Durability Temp-Local Evidence

Status: `COMPLETED_VALIDATED_TEMP_LOCAL_WRITE_RESTART_DURABILITY_NOT_RELIABLE_NOT_READY`

Result label: `CM1033_MEMORY_WRITE_RESTART_DURABILITY_TEMP_LOCAL_PASSED_NOT_RELIABLE_NOT_READY`

CM-1033 records isolated temp-local evidence for accepted write projection durability across store reopen.

## Evidence

Test: `tests/memory-write-restart-durability-temp-local-evidence.test.js`

Marker: `CM1033 write restart durability temp local marker`

The test:

1. Opens an isolated temp-local harness with real local `DiaryStore`, `SqliteShadowStore`, `VectorIndexStore`, `AuditLogStore`, and `CandidateCacheStore` paths under one run-specific temp root.
2. Verifies all configured write, audit, vector, SQLite, and candidate-cache paths resolve under the temp root.
3. Writes one synthetic process record through `MemoryWriteService`.
4. Verifies the write is accepted with `shadowWrite.status=ok`.
5. Verifies SQLite record/chunk, vector, embedding-cache, write-audit, diary file, and candidate-cache surfaces exist before restart.
6. Closes the SQLite shadow store and reopens fresh store instances on the same temp-local paths.
7. Verifies the same memory id, scope fields, SQLite record/chunk, vector, embedding-cache, write-audit entry, candidate-cache entry, and diary file remain visible after reopen.
8. Removes the temp root at test teardown.

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

- one synthetic temp-local accepted write
- one temp-local write-audit append
- one temp-local SQLite shadow projection with chunks
- one temp-local vector projection
- local embedding-cache entries
- one temp-local candidate-cache entry

## Interpretation

CM-1033 proves one bounded temp-local fact: for an accepted synthetic write, the current write path can persist diary, SQLite/chunk, vector, embedding-cache, write-audit, and candidate-cache surfaces across fresh store instances opened on the same isolated temp paths.

It strengthens CM-1031 and CM-1032 by covering restart durability for the normal accepted projection branch. It still does not prove broad write reliability or complete long-run durability.

It does not prove:

- broad write reliability
- default unattended `record_memory` reliability
- broad recall reliability
- write-to-recall reliability
- real cleanup safety
- real rollback safety
- degraded projection recovery
- reconcile cleanup safety
- multi-run or long-horizon durability
- governance closure
- runtime readiness
- RC readiness
- production readiness
- release readiness
- VCP full parity

`memory write reliable`, `memory recall reliable`, long-run durability, rollback readiness, governance closure, and runtime readiness remain not claimed. `RC_NOT_READY_BLOCKED` remains.
