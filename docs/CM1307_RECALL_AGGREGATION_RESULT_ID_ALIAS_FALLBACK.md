# CM-1307 Recall Aggregation Result ID Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1307 fixes a local recall aggregation normalization gap in `KnowledgeBaseRecallPipeline.aggregateCandidates(...)`.

The aggregation path now treats blank camel-case candidate fields as absent before falling through to object-model / SQLite-style aliases:

- `memoryId` -> `memory_id`
- `sourceFile` -> `source_file`
- `chunkId` -> `chunk_id`

## Result

- Candidate grouping no longer uses blank `memoryId` as an effective grouping key.
- Shadow lookup id collection no longer includes blank result ids.
- Aggregated output uses the first non-empty normalized memory id.
- Source fallback accepts `source_file` and chunk fallback accepts `chunk_id`.

## Validation

- `node --check src\recall\KnowledgeBaseRecallPipeline.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\memory-recall-temp-workspace-evidence.test.js tests\recall-precision-hardening-bounded.test.js` passed `43/43`.
- `npm test` passed `2832/2832`.

## Boundaries

This change did not execute live recall, read real memory/store/jsonl, call providers or external MCP tools, write durable memory/audit outside test fixtures, expand public MCP tools, change config/watchdog/startup, push, deploy, or claim readiness/reliability.

