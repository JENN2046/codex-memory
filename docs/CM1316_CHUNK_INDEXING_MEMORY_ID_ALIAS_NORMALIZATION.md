# CM-1316 Chunk Indexing Memory ID Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for chunk-indexing memory id normalization.

Changed:

- `src/recall/ChunkIndexingService.js`
- `tests/recall-isolation-classification-runtime.test.js`

## Result

`ChunkIndexingService` now normalizes record ids through the first non-empty `memoryId/memory_id` value before chunk id generation.

This prevents object-model or SQLite-style records with blank camel-case `memoryId` and populated snake_case `memory_id` from generating blank-prefix chunk ids. Shadow chunk replacement still receives the record object; downstream `SqliteShadowStore` id normalization from CM-1315 handles alias records.

Isolated-record chunk cleanup behavior is preserved.

## Validation

- `node --check src\recall\ChunkIndexingService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\memory-write-reliability-temp-local-evidence.test.js tests\memory-write-restart-durability-temp-local-evidence.test.js` passed `45/45`
- `npm test` passed `2842/2842`
- `git diff --check`

Docs/ledger validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Boundary

- No live recall/write execution.
- No real memory/store/jsonl read.
- No provider call.
- No MCP external call.
- No durable memory/audit write outside temp-local tests.
- No public MCP expansion.
- No config/watchdog/startup change.
- No package/lock/env change.
- No remote action.
- No readiness, write reliability, recall reliability, rollback readiness, or RC readiness claim.
