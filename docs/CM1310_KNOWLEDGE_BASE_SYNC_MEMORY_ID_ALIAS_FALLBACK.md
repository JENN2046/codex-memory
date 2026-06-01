# CM-1310 Knowledge Base Sync Memory ID Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1310 fixes internal knowledge-base sync record id normalization in `KnowledgeBaseSyncService`.

The sync path now treats blank paired fields as absent before falling through across:

- `memoryId`
- `memory_id`

The normalized id is used for:

- shadow `upsertRecord(...)`
- reconcile-task clearing
- stale shadow prune protection
- chunk fingerprint checks
- authoritative write manifest checks
- sync-token construction
- default governance state entry derivation
- candidate-cache invalidation by changed memory ids

## Result

- Diary records with blank `memoryId` and effective `memory_id` are no longer skipped by sync.
- Existing shadow rows with snake-case id data are protected from accidental prune decisions.
- Governance revision entries and cache invalidation bind to the effective memory id.
- Public MCP schema and tool surface are unchanged.

## Validation

- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\phase-b-sync-cache-rerank.test.js tests\memory-recall-temp-workspace-evidence.test.js tests\recall-precision-hardening-bounded.test.js` passed `60/60`.
- `npm test` passed `2836/2836`.

## Boundaries

This change did not execute live recall/write, read real memory/store/jsonl, call providers or external MCP tools, write durable memory/audit outside test fixtures, expand public MCP tools, change config/watchdog/startup, push, deploy, or claim readiness/reliability.
