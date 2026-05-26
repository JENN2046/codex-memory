# CM-1157 Durable Write Kernel Audit Manifest Correlation

Status: `CM1157_DURABLE_WRITE_KERNEL_AUDIT_MANIFEST_CORRELATION_COMPLETED_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1157 continues the durable write kernel hardening chain after CM-1155 and CM-1156.

This slice adds selected audit correlation for SQLite write manifests:

```text
record_memory result idempotency -> write audit manifest summary
write audit manifest summary -> selected-only correlation reader
temp-local runtime tests -> committed/replayed/recoveryRequired/recovered correlation
```

## Implemented

- `MemoryWriteService.writeAudit()` now includes a sanitized `writeManifest` block whenever a write result has idempotency metadata.
- Pending-manifest recovery rejections now carry the already allocated manifest `memoryId`, allowing audit/manifest correlation by memory id.
- `AuditLogStore.readSelectedWriteManifestAuditCorrelation(...)` reads recent write audit entries and returns selected manifest metadata only.
- The selected reader can match by `memoryId`, `idempotencyKey`, `canonicalHash`, and optional `requestSource`.
- The selected reader fails closed when no selector is supplied.

Selected fields:

```text
timestamp
decision
target
memoryId
requestSource
shadowWriteStatus
authoritativeStore
idempotencyKey
canonicalHash
status
replayed
recovered
recoveryRequired
```

Raw fields intentionally not projected:

```text
title
reason
content
evidence
filePath
rawText
raw audit entry
```

## Validation

Passed:

```text
node --check src\storage\AuditLogStore.js
node --check src\core\MemoryWriteService.js
node --check tests\audit-log-store-selected-correlation.test.js
node --check tests\durable-write-kernel-idempotency-runtime.test.js
node --test .\tests\audit-log-store-selected-correlation.test.js .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js .\tests\mcp-contract.test.js
```

Targeted tests passed `22/22`.

Full project validation passed:

```text
npm test
```

Result: `2759/2759` passed.

## Boundaries

CM-1157 does not implement:

- cross-store transactionality
- audit and manifest same-transaction commit
- automatic startup recovery
- corruption quarantine
- migration/import/export/backup/restore
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1157 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores outside temp-local tests
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
corruption quarantine for JSON/vector/cache reads
automatic recovery policy design with explicit guardrails
broader restart/crash-window runtime validation
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
