# CM-1312 Candidate Generator Cache Memory ID Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1312 fixes candidate-generator memory id normalization before candidate output and cache dependency metadata writes.

The generator now treats blank paired fields as absent before falling through across:

- `memoryId`
- `memory_id`

The normalized id is used for:

- candidate `memoryId` projection
- candidate-cache `memoryIds` dependency metadata

## Result

- Chunks with blank `memoryId` and effective `memory_id` produce candidates with the effective id.
- Candidate cache entries retain memory-id dependency metadata for later changed-memory invalidation.
- Cache invalidation by memory id no longer misses these candidates solely because the upstream chunk shape used snake_case.
- Public MCP schema and tool surface are unchanged.

## Validation

- `node --check src\recall\CandidateGenerator.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\phase-b-sync-cache-rerank.test.js tests\memory-recall-temp-workspace-evidence.test.js tests\recall-precision-hardening-bounded.test.js` passed `62/62`.
- `npm test` passed `2838/2838`.

## Boundaries

This change did not execute live recall/write, read real memory/store/jsonl, call providers or external MCP tools, write durable memory/audit outside test cache fixtures, expand public MCP tools, change config/watchdog/startup, push, deploy, or claim readiness/reliability.
