# CM-1298 Lifecycle Scope Current Visibility Policy Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for lifecycle-scope read governance current-scope construction.

`buildLifecycleScopeGovernanceCurrentScope(...)` now derives current visibility from the first non-empty normalized execution-context value across:

- `visibility`
- `visibility_policy`

This prevents an internal runtime context with blank `visibility` and valid SQLite/object-model style `visibility_policy` from suppressing otherwise in-scope recall candidates as `out_of_scope_memory`.

## Validation

- `node --check src\app.js`
- `node --check tests\memory-lifecycle-scope-runtime-integration.test.js`
- `node --test tests\memory-lifecycle-scope-runtime-integration.test.js tests\lifecycle-read-policy-runtime.test.js tests\memory-lifecycle-scope-governance-contract.test.js tests\policy-read-preflight.test.js` passed `32/32`
- `npm test` passed `2820/2820`

## Boundaries

No public MCP schema expansion, live recall, provider call, external MCP call, real-memory scan, durable memory/audit write outside test fixtures, config/watchdog/startup change, remote action, readiness claim, or reliability claim.
