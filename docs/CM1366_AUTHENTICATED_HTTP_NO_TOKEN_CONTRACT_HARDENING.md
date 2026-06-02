# CM-1366 Authenticated HTTP No-Token Contract Hardening

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1366 locally hardens the HTTP MCP missing-token contract exposed by CM-1365.

The change is source/test only. It does not push, rerun the F1 live harness, execute `record_memory`, execute authenticated `search_memory`, read raw memory/audit data, write durable memory/audit data, call providers, change config/watchdog/startup, expand public MCP tools, or claim readiness/reliability.

## Change

`src/adapters/codex-mcp/http.js` now distinguishes:

- valid bearer token
- missing bearer token
- invalid bearer token

When the server is configured with a bearer token and a JSON-RPC POST request omits the token, the request follows the existing no-token read-only contract:

- `tools/call memory_overview` can return the selected low-disclosure overview projection.
- `tools/call record_memory` is rejected with `NO_TOKEN_MUTATION_REJECTED`.
- `tools/call search_memory` is rejected with `NO_TOKEN_SEARCH_REJECTED`.
- invalid bearer token requests still receive unauthorized handling.

`tests/mcp-http.test.js` adds a bearer-configured missing-token regression test for the exact F1 boundary and isolates the HTTP test helper from ambient external provider configuration.

## Validation

```text
node --check src\adapters\codex-mcp\http.js
node --check tests\mcp-http.test.js
node --test tests\mcp-http.test.js tests\http-no-token-search-rejection.test.js
npm test
npm run gate:mainline:strict
```

Results:

```text
targeted_http_tests=29/29
npm_test=2889/2889
gate_mainline_strict=ok
contract_tests=31 pass / 0 fail
compare=43/43 matched
rollback=43/43 ready
```

## Remaining State

This closes the local source/test contract gap, but it does not create accepted F1 live evidence.

F1 still requires a fresh synced HEAD, explicit exact A5-GAP-4 approval for the new commit, and a bounded live no-write rerun. F2/F3/F4/F5 remain blocked until accepted F1 evidence exists.
