# CM-1280 Shadow Projection Record Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1280 fixes a durable governance shadow projection preview normalization edge case.

`DurableGovernanceShadowProjectionPreview` already accepts SQLite-style projection record fields. This change prevents blank camel-case projection fields from masking the corresponding SQLite-style snake_case fields.

## Changed Behavior

`normalizeProjectionRecord(...)` now resolves paired projection record fields by returning the first non-empty normalized candidate across camel-case and snake_case forms.

Covered fields include memory id, scope tuple fields, retention policy, supersession/tombstone fields, lifecycle timestamp, and lifecycle actor client id.

## Validation

- `node --check src\core\DurableGovernanceShadowProjectionPreview.js`
- `node --check tests\durable-governance-shadow-projection-preview.test.js`
- `node --test tests\durable-governance-shadow-projection-preview.test.js tests\durable-governance-mutation-dry-run-helper.test.js tests\memory-supersede-runtime-prep-helper.test.js tests\durable-governance-tombstone-runtime-prep-helper.test.js` passed `26/26`.
- `npm test` passed `2800/2800`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No remote action.
- No readiness or reliability claim.
