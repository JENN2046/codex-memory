# CM-1289 Proof-Retention Visibility Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1289 hardens the proof-memory retention/tombstone no-apply planning path so blank camel-case `visibility` fields do not mask SQLite-style `visibility_policy` fallback fields.

Affected local surfaces:

- `src/core/ProofMemoryRetentionTombstonePlan.js`
- `src/core/ProofMemoryRetentionTombstoneStoreBackedDryRunPreview.js`

## Change

The direct proof-memory retention plan now identifies proof-memory records with first non-empty normalized `visibility/visibility_policy` values.

The store-backed dry-run preview now normalizes store records with the same visibility fallback before passing metadata into the no-apply plan.

This closes the remaining visibility-specific hole after earlier CM-1285 retention/status/id fallback normalization.

## Validation

- `node --check src\core\ProofMemoryRetentionTombstonePlan.js`
- `node --check src\core\ProofMemoryRetentionTombstoneStoreBackedDryRunPreview.js`
- `node --check tests\proof-memory-retention-tombstone-plan.test.js`
- `node --check tests\proof-memory-retention-tombstone-store-backed-dry-run-preview.test.js`
- `node --test tests\proof-memory-retention-tombstone-plan.test.js tests\proof-memory-retention-tombstone-store-backed-dry-run-preview.test.js tests\proof-memory-policy.test.js tests\memory-write-preflight-runtime-integration.test.js` passed `26/26`
- `npm test` passed `2813/2813`

## Boundaries

- No tombstone/apply/cleanup/rollback execution.
- No public MCP tool or schema expansion.
- No provider call.
- No external MCP call.
- No broad real-memory scan.
- No durable memory/audit write outside temp-local test stores.
- No config, watchdog, or startup change.
- No remote action.
- No runtime readiness, RC readiness, write reliability, recall reliability, or rollback readiness claim.
