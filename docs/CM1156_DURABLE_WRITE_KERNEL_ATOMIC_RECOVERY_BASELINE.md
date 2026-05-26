# CM1156 Durable Write Kernel Atomic Recovery Baseline

Status: `CM1156_DURABLE_WRITE_KERNEL_ATOMIC_RECOVERY_BASELINE_COMPLETED_VALIDATED_NOT_READY`
Date: 2026-05-26

## Purpose

CM-1156 continues the CM-1155 durable write kernel line with a narrow runtime hardening slice:

```text
Add atomic local file persistence for diary/vector/cache projection files, add bounded file locks around those writes, and add a manual pending-manifest recovery replay path from diary into SQLite/vector/chunk projections.
```

This is not production readiness and not full write reliability.

## Change

Added `src/storage/AtomicFileWriter.js`:

```text
same-directory temp file
file fsync
rename into place
bounded lockfile wait
stale lock cleanup
best-effort temp cleanup on failure
```

Wired atomic writes into:

```text
DiaryStore.writeRecord()
VectorIndexStore.flush()
CandidateCacheStore.flush()
```

`DiaryStore.writeRecord()` now holds a directory-level diary write lock while selecting the unique filename and writing the file. Vector and candidate cache JSON flushes use target-file lockfiles.

Added `MemoryWriteService.recoverPendingWriteManifests()` as a manual recovery replay surface. It scans pending SQLite write manifests, finds matching diary records by `memoryId`, replays SQLite/vector/chunk projections, finalizes the manifest as `committed` or `degraded`, and writes a recovery audit event.

## Runtime Evidence

Updated temp-local runtime coverage in:

```text
tests/durable-write-kernel-idempotency-runtime.test.js
```

The added tests verify:

```text
atomic projection writes leave no .tmp or .lock artifacts
pending manifest with matching diary record can be replayed into projections
recovered manifest becomes committed
duplicate canonical record_memory after recovery replays the recovered memory id
search_memory can retrieve the recovered memory id
```

## Validation

Targeted validation passed:

```text
node --test .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js .\tests\memory-write-reconcile-service.test.js .\tests\mcp-contract.test.js
```

Result:

```text
25/25 passed
```

Full suite passed:

```text
npm test
```

Result:

```text
2757/2757 passed
```

## Boundary

CM-1156 does not:

```text
claim production readiness
claim write reliability complete
claim recall reliability complete
make cross-store writes transactional
make audit writes part of the same transaction
add automatic startup recovery
add corruption quarantine
run providers
touch real memory stores outside temp-local tests
run migration/import/export/backup/restore
change public MCP tools or schemas
push
```

Remaining work includes automatic startup recovery policy, stronger cross-process JSON merge/compare handling, audit/manifest correlation hardening, corruption quarantine, backup/restore, and broader runtime integration validation.
