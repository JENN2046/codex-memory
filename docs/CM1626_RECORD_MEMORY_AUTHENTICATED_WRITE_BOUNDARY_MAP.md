# CM-1626 Record Memory Authenticated Write Boundary Map

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_AUTHENTICATED_WRITE_BOUNDARY_MAP_NO_NEW_WRITE`

## Scope

This slice records the audit follow-up for P1-2: `record_memory` is not proof-only.

Correct boundary wording:

```text
no-token record_memory is blocked;
authenticated public record_memory is write-capable;
broad/production record_memory reliability is not claimed;
additional effective production writes require separate evidence.
```

This replaces any stale wording that implies `record_memory` can only run inside a proof path or that it is globally gated.

## Current Evidence

Source routing:

- `src/app.js` dispatches public `record_memory` directly to `writeService.record(args, requestContext)`.
- `src/core/MemoryWriteService.js` performs the real write policy, validation, secret scan, proof policy, preflight, diary/shadow/vector/chunk write path, and result construction.

HTTP MCP tests:

- `tests/mcp-http.test.js` includes `HTTP MCP should reject no-token mutation tool calls`.
- `tests/mcp-http.test.js` includes `HTTP MCP bearer-configured missing-token tools/call should keep no-token contract`.
- `tests/mcp-http.test.js` includes `HTTP MCP should execute record_memory through authorized tools/call`.

These tests establish:

- no-token `record_memory` calls are rejected with `Forbidden`
- bearer-configured missing-token `record_memory` calls preserve the no-token blocked contract
- authenticated `record_memory` through `tools/call` reaches the authorized path and returns `decision: accepted`

## Non-Claims

This slice does not execute a new live production `record_memory` call.

The relevant HTTP MCP test uses a temp-local test server and temp-local project paths. It is contract evidence, not production write reliability evidence.

This slice did not run provider/API calls, bearer-token material outside test fixtures, real memory reads/writes, raw store scans, broad memory scans, dependency changes, config/watchdog/startup changes, public MCP expansion, release/tag/deploy, production readiness, release readiness, cutover readiness, or complete V8.

Future production/auth hardening remains separate work. In particular, stronger principal/scope authorization is the P2-2 track and is not implemented here.
