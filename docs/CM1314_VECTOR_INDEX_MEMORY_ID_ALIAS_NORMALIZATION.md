# CM-1314 Vector Index Memory ID Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for vector-index memory id normalization.

Changed:

- `src/storage/VectorIndexStore.js`
- `tests/recall-isolation-classification-runtime.test.js`

## Result

`VectorIndexStore` now normalizes record ids through the first non-empty `memoryId/memory_id` value before:

- vector upsert
- isolated-record vector deletion
- explicit vector deletion by id
- score-map lookup/output
- diary-vector rebuild cache lookup

This prevents object-model or SQLite-style records with blank camel-case `memoryId` and populated snake_case `memory_id` from creating blank-key vector entries, missing cached vectors, or failing isolated-record cleanup.

## Validation

- `node --check src\storage\VectorIndexStore.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\recall-precision-hardening-bounded.test.js tests\memory-recall-limited-local-real-path-evidence.test.js tests\storage-corruption-quarantine.test.js` passed `52/52`
- `npm test` passed `2840/2840`
- `git diff --check`

Docs/ledger validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Boundary

- No live recall/write execution.
- No real memory/store/jsonl read.
- No provider call.
- No MCP external call.
- No durable memory/audit write outside temp-local vector-index test files.
- No public MCP expansion.
- No config/watchdog/startup change.
- No package/lock/env change.
- No remote action.
- No readiness, write reliability, recall reliability, rollback readiness, or RC readiness claim.
