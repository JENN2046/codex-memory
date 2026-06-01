# CM-1315 SQLite Shadow Record ID Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for SQLite shadow-store record and chunk write id normalization.

Changed:

- `src/storage/SqliteShadowStore.js`
- `tests/governance-schema.test.js`

## Result

`SqliteShadowStore` now normalizes record ids through the first non-empty `memoryId/memory_id` value before:

- `upsertRecord(...)`
- `replaceChunksForRecord(...)`

This prevents object-model or SQLite-style records with blank camel-case `memoryId` and populated snake_case `memory_id` from writing blank memory ids or mismatched chunk rows.

## Validation

- `node --check src\storage\SqliteShadowStore.js`
- `node --check tests\governance-schema.test.js`
- `node --test tests\governance-schema.test.js tests\storage-corruption-quarantine.test.js tests\phase-b-sync-cache-rerank.test.js` passed `28/28`
- `npm test` passed `2841/2841`
- `git diff --check`

Docs/ledger validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Boundary

- No live recall/write execution.
- No real memory/store/jsonl read.
- No provider call.
- No MCP external call.
- No durable memory/audit write outside temp-local test SQLite stores.
- No public MCP expansion.
- No config/watchdog/startup change.
- No package/lock/env change.
- No remote action.
- No readiness, write reliability, recall reliability, rollback readiness, or RC readiness claim.
