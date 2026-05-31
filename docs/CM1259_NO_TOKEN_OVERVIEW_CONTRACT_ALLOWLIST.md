# CM-1259 No-Token Overview Contract Allowlist

Date: 2026-06-01

## Purpose

Lock the no-token `memory_overview` selected projection shape with an explicit allowlist test so Codex/Claude clients can treat the projection as a stable low-disclosure contract.

## Change

- Updated `tests/memory-overview-no-token-selected-projection.test.js`.
- Added exact key allowlists for:
  - selected overview top-level fields
  - `access`
  - count-only write `summary`
  - `recall`
  - count-only `recall.summary`

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
node --check tests\memory-overview-no-token-selected-projection.test.js
node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This strengthens the selected projection contract only; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
