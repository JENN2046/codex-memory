# CM-1451 Health Policy Gates Contract Fixture

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_LIVE_RUNTIME`

## Scope

CM-1451 adds independent local test coverage for the authenticated `/health.policyGates` helper introduced by CM-1446.

Changed test:

- `tests/mcp-http.test.js`

## Contract

`buildPolicyGateSummary(...)` may expose only:

- `securityProfile`
- `softReadPolicyEnabled`
- `lifecycleReadPolicyEnabled`
- `writePreflightEnabled`
- `externalProviderAllowed`

It must not expose provider URL/model, filesystem path, token material, memory ids, raw audit, raw store fields, or embedding fingerprints.

## Validation

Passed:

- `node --check tests\mcp-http.test.js`
- `node --test tests\mcp-http.test.js tests\audit-memory-readonly-tool-draft.test.js tests\release-test-gate-matrix-contract.test.js` passed `33/33`

## Boundary

CM-1451 did not run live HTTP runtime, did not use bearer-token material, did not call memory tools, did not call provider/API, did not read/write true memory, did not scan raw stores, did not change config/watchdog/startup, did not expand public MCP tools, and did not claim readiness or `RC_READY`.

