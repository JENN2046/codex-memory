# CM-1183 No-Token Memory Overview HTTP Block

Date: 2026-05-26

Status: `CM1183_NO_TOKEN_MEMORY_OVERVIEW_HTTP_BLOCK_VALIDATED_NOT_READY`

## Scope

CM-1183 is a narrow HTTP boundary source/test slice after CM-1182.

It blocks no-token HTTP JSON-RPC `tools/call` requests for `memory_overview` until a strict selected no-token overview projection exists.

Changed files:

- `src/adapters/codex-mcp/http.js`
- `tests/mcp-http.test.js`

## Source Change

`validateNoTokenJsonRpcRequest(...)` now rejects:

```text
method = tools/call
params.name = memory_overview
```

The rejection happens before MCP tool execution and returns HTTP `403` with JSON-RPC error code `-32001` and selected data code `NO_TOKEN_OVERVIEW_REJECTED`.

Existing no-token `search_memory` behavior is preserved:

- `include_content=true` remains rejected before tool execution
- `include_content=false` remains read-only and covered by existing side-effect tests

Authorized bearer-token `memory_overview` remains executable.

## Validation

Passed:

- `node --check .\src\adapters\codex-mcp\http.js`
- `node --check .\tests\mcp-http.test.js`
- `node --test .\tests\mcp-http.test.js` passed `20/20`

Broader validation:

- `node --test .\tests\mcp-http.test.js .\tests\mcp-contract.test.js .\tests\phase-a-services.test.js` passed `37/37`
- `npm test` passed `2789/2789`
- `node .\scripts\validate_autopilot_ledger_consistency.js` passed
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed
- `git diff --check` passed

## Boundaries

No live `memory_overview` call occurred against real project memory.

Tests used temp-local HTTP/application stores only.

This slice did not read raw memory stores or `.jsonl`, did not call provider/model/API, did not write durable project memory/audit state, did not expand public MCP tools, did not change config/watchdog/startup/package files, did not run migration/import/export/backup/restore apply, did not push, and does not claim production readiness, memory write reliability, memory recall reliability, or `RC_READY`.

## Decision

`CM1183_NO_TOKEN_MEMORY_OVERVIEW_HTTP_BLOCK_VALIDATED_NOT_READY`

This closes the specific CM-1182 no-token `memory_overview` selected-output blocker by failing closed at the HTTP boundary. It does not implement a selected no-token overview projection and does not close full no-token governance.
