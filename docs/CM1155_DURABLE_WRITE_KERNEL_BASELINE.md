# CM1155 Durable Write Kernel Baseline

Status: `CM1155_DURABLE_WRITE_KERNEL_BASELINE_COMPLETED_VALIDATED_NOT_READY`
Date: 2026-05-26

## Purpose

CM-1155 starts the new runtime-kernel line after the CM-1120 / CM-1153 governance chain.

The goal is narrow:

```text
Establish a minimum durable memory write kernel baseline by identifying SQLite as the authoritative runtime write manifest store, adding default idempotency, adding a recovery gate for pending manifests, and proving record_memory -> search_memory -> memory_overview consistency in temp-local runtime integration tests.
```

This is not a production-ready claim.

## Change

SQLite now owns a write manifest table:

```text
memory_write_manifests
```

The manifest records:

```text
idempotency_key
memory_id
canonical_hash
target
status
result_json
created_at
updated_at
committed_at
```

`SqliteShadowStore.getHealth()` now reports:

```text
authoritativeStore=sqlite
writeManifest.total
writeManifest.pending
writeManifest.committed
writeManifest.degraded
writeManifest.failed
```

`MemoryWriteService.record()` now computes a default canonical idempotency key without expanding the public MCP schema. A duplicate canonical write returns the already committed memory id instead of creating a second diary/shadow/vector/chunk projection.

If a matching manifest is still `pending`, the write fails closed with recovery required and does not write a new memory record.

## Runtime Evidence

Added temp-local runtime integration coverage:

```text
tests/durable-write-kernel-idempotency-runtime.test.js
```

The runtime test verifies:

```text
record_memory first call -> accepted, one memory id
record_memory duplicate call -> accepted idempotent replay, same memory id
search_memory scoped query -> returns the same memory id
memory_overview -> reports sqlite authoritative store and one committed write manifest
pending manifest -> duplicate canonical write is rejected before durable projection
```

Updated existing write reliability evidence:

```text
tests/memory-write-reliability-temp-local-evidence.test.js
```

The old duplicate-write expectation is now reversed: duplicate synthetic payloads deduplicate through the write manifest.

## Validation

Targeted validation passed:

```text
node --test .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\memory-write-reconcile-service.test.js .\tests\memory-write-preflight-runtime-integration.test.js .\tests\mcp-contract.test.js
```

Result:

```text
29/29 passed
```

Broader validation passed after updating the stale CM-1130 test expectation for the already-supported recall-suppression follow-up route:

```text
npm test
```

Result:

```text
2755/2755 passed
```

## Boundary

CM-1155 does not:

```text
claim production readiness
claim write reliability complete
claim recall reliability complete
change public MCP tools or record_memory schema
call providers
touch real memory stores
run migration/import/export/backup/restore
add file locking
make diary/vector/cache writes atomic
implement crash replay repair for all partial phases
push
```

Remaining work includes cross-store transaction/recovery design, atomic file writes, process/file locks, corruption quarantine, backup/restore, and broader runtime integration validation.
