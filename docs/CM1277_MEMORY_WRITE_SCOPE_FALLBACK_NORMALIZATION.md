# CM-1277 Memory Write Scope Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1277 fixes the matching write-service scope normalization edge case after CM-1276.

`MemoryWriteService` now avoids letting blank execution-context camel-case scope fields mask valid snake-case fields or payload fallback values. This keeps persisted Codex/Claude write scope attribution stable when mixed metadata forms are present.

## Changed Behavior

`normalizeScopeField(...)` now evaluates candidate values in precedence order and returns the first non-empty normalized string:

1. execution context camel-case field
2. execution context snake-case field
3. payload snake-case field
4. payload camel-case field

The precedence order is unchanged for non-empty values; the fix only makes blank strings fall through correctly.

## Validation

- `node --check src\core\MemoryWriteService.js`
- `node --check tests\memory-write-preflight-runtime-integration.test.js`
- `node --test tests\memory-write-preflight-runtime-integration.test.js tests\phase-a-services.test.js tests\policy-read-preflight.test.js` passed `29/29`.
- `npm test` passed `2797/2797`.

## Boundaries

- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory or audit write outside test fixtures.
- No config, watchdog, or startup change.
- No remote action.
- No readiness or reliability claim.
