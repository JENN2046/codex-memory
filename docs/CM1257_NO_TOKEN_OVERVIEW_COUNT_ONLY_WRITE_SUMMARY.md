# CM-1257 No-Token Overview Count-Only Write Summary

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local runtime privacy hardening for the no-token `memory_overview` selected projection.

Changed files:

- `src/core/MemoryOverviewService.js`
- `tests/memory-overview-no-token-selected-projection.test.js`
- `tests/http-no-token-search-rejection.test.js`
- `tests/mcp-http.test.js`
- `docs/CM1257_NO_TOKEN_OVERVIEW_COUNT_ONLY_WRITE_SUMMARY.md`
- `STATUS.md`
- `.agent_board/*`

No provider call, real-memory scan, durable memory/audit write, config/watchdog/startup change, public MCP expansion, remote action, readiness claim, or reliability claim is included in CM-1257.

## Result

CM-1257 changes no-token selected overview write summary from full write summary shape to count-only shape.

The no-token projection still reports aggregate counts:

- sample size
- accepted / rejected counts
- process / knowledge accepted counts
- process / knowledge rejected counts
- blocked direct-write count
- sensitive rejected count

The no-token projection no longer returns write activity timestamps:

- `latestAcceptedAt`
- `latestRejectedAt`

Bearer-token authorized `memory_overview` still uses the full overview path and can return the full write summary. No-token `record_memory` and `search_memory` remain blocked.

## Validation

Planned and/or executed validation for this slice:

```powershell
node --check src\core\MemoryOverviewService.js
node --check tests\memory-overview-no-token-selected-projection.test.js
node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Non-Claims

CM-1257 does not close full no-token governance, write reliability, recall reliability, runtime readiness, RC readiness, production readiness, cutover readiness, or personal RC dogfood.
