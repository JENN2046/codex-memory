# CM-1284 Lifecycle Id/Status Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for lifecycle-scope governance record and transition normalization.

This change does not call providers, call MCP external tools, scan real memory, write durable memory or audit outside test fixtures, change config/watchdog/startup, expand public MCP tools, push, deploy, or claim readiness/reliability.

## Change

`src/core/MemoryLifecycleScopeGovernanceContract.js` now uses the first non-empty normalized value for paired camel-case and snake_case fields.

Covered fields:

- `memoryId` / `memory_id`
- `lifecycleStatus` / `lifecycle_status`
- `targetMemoryId` / `target_memory_id`
- `replacementMemoryId` / `replacement_memory_id`
- `actorId` / `actor_id`

This prevents blank camel-case fields from masking valid snake_case lifecycle metadata in recall eligibility and governance transition fixtures.

## Validation

- `node --check src\core\MemoryLifecycleScopeGovernanceContract.js`
- `node --check tests\memory-lifecycle-scope-governance-contract.test.js`
- `node --test tests\memory-lifecycle-scope-governance-contract.test.js tests\memory-lifecycle-scope-read-policy-fixture.test.js tests\memory-lifecycle-scope-runtime-integration.test.js tests\lifecycle-read-policy-runtime.test.js` passed `28/28`.
- `npm test` passed `2805/2805`.

## Remaining Boundary

This is local source/test evidence only. It is not fresh live client evidence, recall reliability, write reliability, runtime readiness, cutover readiness, or RC readiness.
