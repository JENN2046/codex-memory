# CM-1262 Memory Overview HTTP Client Contract

Date: 2026-06-01

## Purpose

Lock the HTTP client-visible `memory_overview` contract at both auth boundaries.

## Change

- Added no-token HTTP `tools/list` assertions that the `memory_overview` description exposes the selected low-disclosure projection behavior.
- Added bearer-token HTTP `tools/call` assertions that authorized `memory_overview` still returns full-overview-only fields such as `paths` and `embeddingProfile`.
- Kept no-token `record_memory` and `search_memory` blocked.

## Boundary

- Test, docs, and status update only.
- No runtime behavior change.
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
node --check tests\http-no-token-search-rejection.test.js
node --check tests\mcp-http.test.js
node --test tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js tests\mcp-contract.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This is HTTP client contract regression coverage only; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
