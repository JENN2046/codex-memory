# CM-1159 SQLite JSON Corruption Reporting

Status: `CM1159_SQLITE_JSON_CORRUPTION_REPORTING_COMPLETED_VALIDATED_NOT_READY`

Date: 2026-05-26

## Scope

CM-1159 continues the durable write kernel hardening chain after CM-1158.

This slice prevents selected SQLite shadow read paths from throwing on malformed JSON fields:

```text
memory_records.tags_json malformed -> mapped tags=[] with malformed metadata
memory_chunks.vector_json malformed -> mapped vector=[] with malformed metadata
memory_chunks.tags_json malformed -> mapped tags=[] with malformed metadata
shadow health -> selected JSON corruption counters
```

## Implemented

- Added `SqliteShadowStore.parseJsonArrayField(...)`.
- `mapRow()` now reports `tagsJsonMalformed` and `tagsJsonParseError`.
- `mapChunkRow()` now reports `vectorJsonMalformed`, `vectorJsonParseError`, `tagsJsonMalformed`, and `tagsJsonParseError`.
- `getHealth()` now reports selected `jsonCorruption` counters.
- Added temp-local SQLite test coverage for malformed `tags_json` and `vector_json` row fields.

Selected health metadata:

```text
jsonCorruption.malformedRecordTags
jsonCorruption.malformedChunkVectors
jsonCorruption.malformedChunkTags
jsonCorruption.malformedManifestResults
jsonCorruption.malformedReconcilePayloads
jsonCorruption.totalMalformed
```

## Validation

Passed:

```text
node --check src\storage\SqliteShadowStore.js
node --check tests\storage-corruption-quarantine.test.js
node --test .\tests\storage-corruption-quarantine.test.js .\tests\durable-write-kernel-idempotency-runtime.test.js .\tests\memory-write-restart-durability-temp-local-evidence.test.js .\tests\memory-write-reliability-temp-local-evidence.test.js
npm test
```

Targeted tests passed `14/14`.

Full project validation passed `2764/2764`.

Additional local checks passed:

```text
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
focused no-secret/no-overclaim scan
changed-scope re-review
```

## Boundaries

CM-1159 does not implement:

- SQLite row quarantine tables
- SQLite automatic row repair
- migration/import/export/backup/restore
- diary corruption quarantine
- chat index corruption quarantine
- cross-store transactionality
- automatic startup recovery
- production readiness
- write reliability
- recall reliability
- RC readiness

CM-1159 does not:

- expand public MCP tools or schemas
- call providers or external APIs
- mutate real memory stores during validation
- edit secrets or `.env`
- change config/watchdog/startup/dependencies
- push, tag, release, or deploy

## Next

Recommended next local-safe kernel slices:

```text
guarded automatic pending-manifest recovery policy design
broader restart/crash-window runtime validation
SQLite row quarantine / repair design only
```

Do not claim production readiness, write reliability, recall reliability, or `RC_READY`.
