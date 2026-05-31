# CM-1278 Lifecycle Scope Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1278 fixes the lifecycle scope governance version of the scope fallback edge case handled in CM-1276 and CM-1277.

`MemoryLifecycleScopeGovernanceContract` now avoids letting blank camel-case scope fields mask valid snake_case fields. This keeps recall eligibility and lifecycle governance checks stable when Codex/Claude scope metadata arrives in mixed field forms.

## Changed Behavior

`normalizeScope(...)` now evaluates each lifecycle scope field candidate and returns the first non-empty normalized string:

1. camel-case field
2. snake_case field

The precedence order is unchanged for non-empty values; the fix only makes blank strings fall through correctly.

## Validation

- `node --check src\core\MemoryLifecycleScopeGovernanceContract.js`
- `node --check tests\memory-lifecycle-scope-governance-contract.test.js`
- `node --test tests\memory-lifecycle-scope-governance-contract.test.js tests\memory-lifecycle-scope-read-policy-fixture.test.js tests\memory-lifecycle-scope-runtime-integration.test.js` passed `20/20`.
- `npm test` passed `2798/2798`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No remote action.
- No readiness or reliability claim.
