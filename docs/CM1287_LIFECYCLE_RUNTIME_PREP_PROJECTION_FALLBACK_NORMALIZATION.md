# CM-1287 Lifecycle Runtime-Prep Projection Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1287 hardens tombstone and supersede runtime-prep projection-record normalization in local source/test paths only.

Touched runtime surfaces:

- `src/core/DurableGovernanceTombstoneRuntimePrepHelper.js`
- `src/core/MemorySupersedeRuntimePrepHelper.js`

Touched tests:

- `tests/durable-governance-tombstone-runtime-prep-helper.test.js`
- `tests/memory-supersede-runtime-prep-helper.test.js`

## Change

Tombstone and supersede runtime-prep helpers now preserve full projection records while using first-non-empty normalized fallback selection for paired fields:

- `memoryId` / `memory_id`
- `status` / `lifecycleStatus` / `lifecycle_status`
- `clientId` / `client_id`
- `visibility` / `visibility_policy`
- `lifecycleUpdatedAt` / `lifecycle_updated_at`

The helpers also pass normalized projection records into downstream shadow projection and pair outcome previews. This prevents blank camel-case values from masking valid snake_case store/projection fields in the runtime-prep chain.

## Validation

- `node --check src\core\DurableGovernanceTombstoneRuntimePrepHelper.js`
- `node --check src\core\MemorySupersedeRuntimePrepHelper.js`
- `node --check tests\durable-governance-tombstone-runtime-prep-helper.test.js`
- `node --check tests\memory-supersede-runtime-prep-helper.test.js`
- `node --test tests\durable-governance-tombstone-runtime-prep-helper.test.js tests\memory-supersede-runtime-prep-helper.test.js tests\durable-governance-shadow-projection-preview.test.js tests\memory-supersede-pair-outcome-helper.test.js tests\memory-supersede-shadow-seam-contract.test.js` passed `34/34` after the downstream normalized-record repair.
- `npm test` passed `2812/2812`.

## Boundaries

- No runtime apply.
- No public MCP tool expansion.
- No provider call.
- No external MCP call.
- No real-memory scan.
- No durable memory/audit write.
- No config/watchdog/startup change.
- No remote action.
- No readiness, RC readiness, rollback readiness, write reliability, or recall reliability claim.
