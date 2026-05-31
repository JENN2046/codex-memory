# CM-1261 Memory Overview Schema Description Sync

Date: 2026-06-01

## Purpose

Align the client-visible `memory_overview` tool description and README no-token behavior with the current selected projection implementation.

## Change

- Updated `src/core/constants.js` so `memory_overview.description` states:
  - HTTP no-token calls return only a selected low-disclosure overview projection.
  - bearer-token calls return the full overview.
- Added an MCP `tools/list` contract test in `tests/mcp-contract.test.js`.
- Updated `README.md` no-token behavior and MCP tool semantics.

## Boundary

- Source metadata, test, docs, and status update only.
- No runtime execution path change.
- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory/audit write.
- No config, watchdog, or startup change.
- No push, PR, tag, release, deploy, cutover, readiness, write reliability, or recall reliability claim.

## Validation

Planned validation:

```powershell
node --check src\core\constants.js
node --check tests\mcp-contract.test.js
node --test tests\mcp-contract.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This improves client-facing contract clarity only; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
