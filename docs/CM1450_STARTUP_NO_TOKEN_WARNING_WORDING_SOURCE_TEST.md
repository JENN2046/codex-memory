# CM-1450 Startup No-Token Warning Wording Source/Test

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_STARTUP_MUTATION`

## Scope

CM-1450 tightens the loopback/no-token HTTP warning wording without changing startup, watchdog, install, host, port, token, or config behavior.

Changed source/test:

- `src/adapters/codex-mcp/http.js`
- `tests/mcp-http.test.js`

## Implementation

`getHttpAuthWarning(...)` now says loopback/no-token mode is local development only and explicitly names `CODEX_MEMORY_HTTP_TOKEN`. It also warns not to expose the listener beyond the local machine.

The non-loopback/no-token path still fails closed with the existing token-required error.

## Validation

Passed:

- `node --check src\adapters\codex-mcp\http.js`
- `node --check tests\mcp-http.test.js`
- `node --test tests\mcp-http.test.js tests\audit-memory-readonly-tool-draft.test.js tests\release-test-gate-matrix-contract.test.js` passed `33/33`

## Boundary

CM-1450 did not run live runtime, did not change startup/watchdog/config behavior, did not use bearer-token material, did not call memory tools, did not call provider/API, did not read or write true memory, did not scan raw stores, did not expand public MCP tools, did not perform remote actions, and did not claim readiness or `RC_READY`.
