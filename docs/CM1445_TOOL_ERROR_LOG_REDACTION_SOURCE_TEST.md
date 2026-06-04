# CM-1445 Tool Error Log Redaction Source/Test

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_APPLY`

## Scope

CM-1445 closes the log-level leakage gap identified in static review: tool error logs must not persist raw secret-like stack or message fragments.

Changed source/test:

- `src/adapters/codex-mcp/server.js`
- `tests/json-rpc-error-redaction.test.js`

No public MCP tool was added or changed.

## Implementation

`appendToolErrorLog(app, toolName, error)` now routes the selected stack/message string through `redactSensitiveFragments(...)` before appending the HTTP tool error log entry.

The regression test creates a temporary HTTP log path, triggers a synthetic tool error containing secret-like bearer text, provider URL text, and local env-path text, then verifies the persisted log contains a redaction marker and not the sensitive fragments.

## Validation

Passed:

- `node --check src\adapters\codex-mcp\server.js`
- `node --check tests\json-rpc-error-redaction.test.js`
- `node --test tests\json-rpc-error-redaction.test.js tests\sensitive-fragment-redaction.test.js` passed `10/10`
- `git diff --check`
- `npm test` passed `3017/3017`

## Boundary

CM-1445 did not execute runtime, live `record_memory`, live `search_memory`, `memory_overview`, bearer-token paths, provider/API calls, true memory read/write, raw store scan, durable memory/audit write, config/watchdog/startup change, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.
