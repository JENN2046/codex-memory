# CM-1281 Write Lifecycle Preflight Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1281 fixes a write lifecycle/dedup suppression preflight normalization edge case.

`MemoryWriteLifecycleDedupSuppressionPreflight` now avoids letting blank camel-case fields mask valid snake_case fallback fields in write preflight scope, lifecycle target ids, existing candidate memory ids, and canonical hashes.

## Changed Behavior

The preflight now resolves paired fields by returning the first non-empty normalized candidate.

Covered areas:

- write scope fields
- `supersedesMemoryId` / `supersedes_memory_id`
- `tombstoneMemoryId` / `tombstone_memory_id`
- `forgetMemoryId` / `forget_memory_id`
- existing candidate `memoryId` / `memory_id`
- existing candidate `canonicalHash` / `canonical_hash`

## Validation

- `node --check src\core\MemoryWriteLifecycleDedupSuppressionPreflight.js`
- `node --check tests\memory-write-lifecycle-dedup-suppression-preflight.test.js`
- `node --test tests\memory-write-lifecycle-dedup-suppression-preflight.test.js tests\memory-write-preflight-runtime-integration.test.js tests\durable-write-kernel-idempotency-runtime.test.js tests\memory-write-restart-durability-temp-local-evidence.test.js` passed `33/33`.
- `npm test` passed `2801/2801`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No remote action.
- No readiness or reliability claim.
