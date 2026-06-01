# CM-1311 Candidate Cache Governance Entry ID Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1311 fixes candidate-cache governance state entry id normalization in `CandidateCacheStore`.

The cache store now treats blank paired fields as absent before falling through across:

- `memoryId`
- `memory_id`

The normalized id is used for:

- governance-state entry persistence
- governance-state entry retrieval
- entry validity filtering
- stable entry ordering

## Result

- Governance entries with blank `memoryId` and effective `memory_id` remain usable after persistence.
- Entries without any effective id are dropped before storage.
- Stored entries sort by normalized `memoryId`, keeping governance diffing stable.
- Public MCP schema and tool surface are unchanged.

## Validation

- `node --check src\storage\CandidateCacheStore.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\phase-b-sync-cache-rerank.test.js tests\storage-corruption-quarantine.test.js` passed `52/52`.
- `npm test` passed `2837/2837`.

## Boundaries

This change did not execute live recall/write, read real memory/store/jsonl, call providers or external MCP tools, write durable memory/audit outside temp-local test cache, expand public MCP tools, change config/watchdog/startup, push, deploy, or claim readiness/reliability.
