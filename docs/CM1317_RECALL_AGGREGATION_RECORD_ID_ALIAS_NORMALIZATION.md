# CM-1317 Recall Aggregation Record ID Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for recall aggregation returned-record id normalization.

Changed:

- `src/recall/KnowledgeBaseRecallPipeline.js`
- `tests/recall-isolation-classification-runtime.test.js`

## Result

`KnowledgeBaseRecallPipeline.aggregateCandidates(...)` now normalizes records returned by `shadowStore.getRecordsByIds(...)` through the first non-empty `memoryId/memory_id` value before building the record map.

This prevents shadow/object-model records with blank camel-case `memoryId` and populated snake_case `memory_id` from missing the authoritative record lookup. Record title, source path, and content fallback remain available for aggregated results.

The existing priority for aggregated `text` remains unchanged: chunk text still wins when present.

## Validation

- `node --check src\recall\KnowledgeBaseRecallPipeline.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\memory-recall-temp-workspace-evidence.test.js tests\recall-precision-hardening-bounded.test.js` passed `49/49`
- `npm test` passed `2843/2843`
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
