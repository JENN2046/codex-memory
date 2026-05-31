# CM-1260 No-Token Overview HTTP Contract Allowlist

Date: 2026-06-01

## Purpose

Extend the no-token `memory_overview` selected projection contract guard from direct core output to the HTTP JSON-RPC boundary used by Codex/Claude clients.

## Change

- Updated `tests/http-no-token-search-rejection.test.js`.
- Updated `tests/mcp-http.test.js`.
- Added exact allowlist assertions for the no-token HTTP `memory_overview` response:
  - selected overview top-level fields
  - `access` marker and disclosure flags

## Boundary

- Test/docs/status-only hardening.
- No runtime implementation change.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory/audit write.
- No config, watchdog, or startup change.
- No public MCP tool expansion.
- No push, PR, tag, release, deploy, cutover, readiness, write reliability, or recall reliability claim.

## Validation

Planned validation:

```powershell
node --check tests\http-no-token-search-rejection.test.js
node --check tests\mcp-http.test.js
node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This locks the HTTP client-visible response shape only; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
