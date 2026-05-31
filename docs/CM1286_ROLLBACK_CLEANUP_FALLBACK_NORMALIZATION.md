# CM-1286 Rollback Cleanup Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1286 hardens rollback cleanup preview and apply-design normalization in local source/test paths only.

Touched runtime surfaces:

- `src/core/MemoryWriteRollbackCleanupDryRunPreview.js`
- `src/core/MemoryWriteRollbackCleanupStoreBackedDryRunPreview.js`
- `src/core/MemoryWriteRollbackCleanupApplyDesignPolicy.js`

Touched tests:

- `tests/memory-write-rollback-cleanup-dry-run-preview.test.js`
- `tests/memory-write-rollback-cleanup-store-backed-dry-run-preview.test.js`
- `tests/memory-write-rollback-cleanup-apply-design-policy.test.js`

## Change

Rollback cleanup dry-run preview, store-backed dry-run preview, and apply-design policy now use first-non-empty normalized fallback selection for paired camel-case and snake_case fields:

- cleanup preview `memoryId` / `memory_id`
- reconcile task `memoryId` / `memory_id`
- reconcile task `storeKind` / `store_kind`
- planned action `memoryId` / `memory_id`
- planned action `storeKind` / `store_kind`
- apply design `memoryId` / `memory_id`
- store-backed preview report `memoryId` / `memory_id`

This prevents blank camel-case values from masking valid snake_case store/projection fields when building no-apply rollback cleanup previews and apply-design review surfaces.

## Validation

- `node --check src\core\MemoryWriteRollbackCleanupDryRunPreview.js`
- `node --check src\core\MemoryWriteRollbackCleanupStoreBackedDryRunPreview.js`
- `node --check src\core\MemoryWriteRollbackCleanupApplyDesignPolicy.js`
- `node --check tests\memory-write-rollback-cleanup-dry-run-preview.test.js`
- `node --check tests\memory-write-rollback-cleanup-store-backed-dry-run-preview.test.js`
- `node --check tests\memory-write-rollback-cleanup-apply-design-policy.test.js`
- `node --test tests\memory-write-rollback-cleanup-dry-run-preview.test.js tests\memory-write-rollback-cleanup-store-backed-dry-run-preview.test.js tests\memory-write-rollback-cleanup-apply-design-policy.test.js tests\memory-write-rollback-cleanup-plan-boundary.test.js tests\memory-write-rollback-cleanup-design-review-policy.test.js` passed `30/30`.
- `npm test` passed `2810/2810`.

## Boundaries

- No cleanup/apply/rollback execution.
- No public MCP tool expansion.
- No provider call.
- No external MCP call.
- No real-memory scan.
- No durable memory/audit write outside temp-local test stores.
- No config/watchdog/startup change.
- No remote action.
- No readiness, RC readiness, rollback readiness, write reliability, or recall reliability claim.
