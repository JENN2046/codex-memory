# CM-1446 Authenticated Health Policy Gates Source/Test

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_APPLY`

## Scope

CM-1446 makes authenticated full `/health` expose explicit policy gate status without widening low-disclosure no-token health.

Changed source/test:

- `src/adapters/codex-mcp/http.js`
- `tests/mcp-http.test.js`

No startup, watchdog, config, or provider behavior was changed.

## Implementation

`createFullHealthPayload(...)` now includes a bounded `policyGates` object:

- `securityProfile`
- `softReadPolicyEnabled`
- `lifecycleReadPolicyEnabled`
- `writePreflightEnabled`
- `externalProviderAllowed`

The no-token `/health` payload remains low-disclosure and does not include `policyGates`. The test also verifies provider URL/model configuration is not serialized through the new authenticated health field.

## Validation

Passed:

- `node --check src\adapters\codex-mcp\http.js`
- `node --check tests\mcp-http.test.js`
- `node --test tests\mcp-http.test.js tests\http-no-token-search-rejection.test.js tests\security-profile-config.test.js tests\external-provider-gate.test.js` passed `68/68`
- `git diff --check`
- `npm test` passed `3017/3017`

## Boundary

CM-1446 did not use a live bearer token, did not call live HTTP MCP, did not call memory tools, did not call provider/API, did not read or write true memory, did not scan raw stores, did not alter config/watchdog/startup, did not expand public MCP tools, and did not claim readiness or `RC_READY`.

