# CM-1158 Durable Write Kernel Corruption Quarantine

Status: `CM1158_DURABLE_WRITE_KERNEL_CORRUPTION_QUARANTINE_COMPLETED_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1158 continues the durable write kernel hardening chain after CM-1157.

This slice prevents corrupt JSON projection files from being silently overwritten:

```text
vector index corrupt/invalid-shape JSON -> quarantine original file -> rebuild empty index
candidate cache corrupt/invalid-shape JSON -> quarantine original file -> rebuild empty cache
health output -> selected quarantine metadata
```

## Implemented

- Added `quarantineFile(...)` to `AtomicFileWriter`.
- `VectorIndexStore.ensureReady()` now distinguishes missing file from corrupt JSON.
- Corrupt or invalid-shape vector index JSON is renamed to a `.corrupt-*` quarantine file before a new empty vector index is written.
- `CandidateCacheStore.ensureReady()` now distinguishes missing file from corrupt JSON.
- Corrupt or invalid-shape candidate cache JSON is renamed to a `.corrupt-*` quarantine file before a new empty cache is written.
- Vector and candidate-cache health now expose selected quarantine metadata.

Selected quarantine metadata:

```text
quarantined
reason
sourcePath
quarantinePath
timestamp
```

## Validation

Passed:

```text
node --check src\storage\AtomicFileWriter.js
node --check src\storage\VectorIndexStore.js
node --check src\storage\CandidateCacheStore.js
node --check tests\storage-corruption-quarantine.test.js
node --test .\tests\storage-corruption-quarantine.test.js .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js
```

Targeted tests passed `13/13`.

Full project validation passed:

```text
npm test
```

Result: `2763/2763` passed.

Additional local checks passed:

```text
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused no-secret/no-overclaim scan
changed-scope re-review
```

## Boundaries

CM-1158 does not implement:

- SQLite row-level corruption quarantine
- diary corruption quarantine
- chat index corruption quarantine
- cross-store transactionality
- automatic startup recovery
- migration/import/export/backup/restore
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1158 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
SQLite JSON-field corruption quarantine/reporting
guarded automatic pending-manifest recovery policy design
broader restart/crash-window runtime validation
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
