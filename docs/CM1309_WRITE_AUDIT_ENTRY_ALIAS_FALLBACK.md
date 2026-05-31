# CM-1309 Write Audit Entry Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1309 fixes internal write audit append projection normalization in `MemoryWriteService.writeAudit(...)`.

The write audit entry now treats blank paired fields as absent before falling through across result aliases for:

- `agentAlias` / `agent_alias`
- `agentId` / `agent_id`
- `memoryId` / `memory_id`
- `filePath` / `file_path`
- `requestSource` / `request_source`

The nested write manifest projection now applies the same first non-empty normalization for:

- `authoritativeStore` / `authoritative_store`
- `key` / `idempotencyKey` / `idempotency_key`
- `canonicalHash` / `canonical_hash`

## Result

- Internal write result or recovery/replay paths with blank camel-case fields no longer mask effective snake_case audit metadata.
- Write audit entries appended by the service preserve selected manifest correlation evidence.
- Public MCP schema and tool surface are unchanged.

## Validation

- `node --check src\core\MemoryWriteService.js`
- `node --check tests\memory-write-preflight-runtime-integration.test.js`
- `node --test tests\memory-write-preflight-runtime-integration.test.js tests\durable-write-kernel-idempotency-runtime.test.js tests\audit-log-store-selected-correlation.test.js tests\memory-write-restart-durability-temp-local-evidence.test.js` passed `32/32`.
- `npm test` passed `2835/2835`.

## Boundaries

This change did not execute live write/recall, read real memory/store/jsonl, call providers or external MCP tools, write durable memory/audit outside test fixtures, expand public MCP tools, change config/watchdog/startup, push, deploy, or claim readiness/reliability.

