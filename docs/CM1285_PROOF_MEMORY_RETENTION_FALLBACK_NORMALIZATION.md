# CM-1285 Proof-Memory Retention Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1285 hardens proof-memory retention/tombstone candidate normalization in local source/test paths only.

Touched runtime surfaces:

- `src/core/ProofMemoryRetentionTombstonePlan.js`
- `src/core/ProofMemoryRetentionTombstoneStoreBackedDryRunPreview.js`

Touched tests:

- `tests/proof-memory-retention-tombstone-plan.test.js`
- `tests/proof-memory-retention-tombstone-store-backed-dry-run-preview.test.js`

## Change

The proof-memory retention design plan and store-backed dry-run preview now use first-non-empty normalized fallback selection for paired camel-case and snake_case fields:

- `memoryId` / `memory_id`
- `status` / `lifecycleStatus` / `lifecycle_status`
- `retentionPolicy` / `retention_policy`
- `validationStatus` / `validation_status`
- `validatedAt` / `validated_at` / `validationCompletedAt` / `validation_completed_at`
- `validatedAtSource` / `validated_at_source` in the store-backed preview

This prevents blank camel-case values from masking valid snake_case store/projection fields when building no-apply proof-memory tombstone previews.

## Validation

- `node --check src\core\ProofMemoryRetentionTombstonePlan.js`
- `node --check src\core\ProofMemoryRetentionTombstoneStoreBackedDryRunPreview.js`
- `node --check tests\proof-memory-retention-tombstone-plan.test.js`
- `node --check tests\proof-memory-retention-tombstone-store-backed-dry-run-preview.test.js`
- `node --test tests\proof-memory-retention-tombstone-plan.test.js tests\proof-memory-retention-tombstone-store-backed-dry-run-preview.test.js tests\proof-memory-policy.test.js tests\memory-write-preflight-runtime-integration.test.js` passed `26/26`.
- `npm test` passed `2807/2807`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No external MCP call.
- No real-memory scan.
- No durable memory/audit write outside test fixtures.
- No config/watchdog/startup change.
- No remote action.
- No readiness, RC readiness, write reliability, or recall reliability claim.
