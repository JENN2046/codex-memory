# CM-1279 Internal Runtime Entry Actor Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1279 fixes an internal runtime-entry identity fallback edge case.

`InternalRuntimeEntryGate` now avoids letting blank `actor_client_id`, `actorClientId`, or execution-context `clientId` values mask a valid execution-context `client_id` or fallback actor id. This keeps internal tombstone/supersede/validate/deferred-governance entry attribution stable when mixed Codex/Claude identity metadata forms are present.

## Changed Behavior

`buildInternalRuntimeEntryPayload(...)` now resolves `actor_client_id` by returning the first non-empty normalized candidate:

1. `actor_client_id`
2. `actorClientId`
3. execution-context `clientId`
4. execution-context `client_id`
5. fallback actor client id

The precedence order is unchanged for non-empty values; the fix only makes blank strings fall through correctly.

## Validation

- `node --check src\core\InternalRuntimeEntryGate.js`
- `node --check tests\internal-runtime-entry-gate.test.js`
- `node --test tests\internal-runtime-entry-gate.test.js tests\deferred-governance-runtime-entry-adapter.test.js tests\tombstone-memory-runtime-entry.test.js tests\supersede-memory-runtime-entry.test.js tests\validate-memory-runtime-entry.test.js` passed `29/29`.
- `npm test` passed `2799/2799`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No remote action.
- No readiness or reliability claim.
