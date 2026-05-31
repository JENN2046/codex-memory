# CM-1258 No-Token Overview Projection Version

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local runtime contract hardening for no-token `memory_overview` selected projection.

Changed files:

- `src/core/MemoryOverviewService.js`
- `tests/memory-overview-no-token-selected-projection.test.js`
- `tests/http-no-token-search-rejection.test.js`
- `tests/mcp-http.test.js`
- `docs/CM1258_NO_TOKEN_OVERVIEW_PROJECTION_VERSION.md`
- `STATUS.md`
- `.agent_board/*`

No provider call, real-memory scan, durable memory/audit write, config/watchdog/startup change, public MCP tool expansion, remote action, readiness claim, or reliability claim is included in CM-1258.

## Result

No-token `memory_overview` selected projection now includes an explicit projection contract marker:

```json
{
  "access": {
    "mode": "no_token_selected_overview",
    "selectedProjection": true,
    "selectedProjectionVersion": 1
  }
}
```

This gives Codex/Claude clients and audit surfaces a stable versioned marker for the selected projection shape without exposing full overview fields.

Bearer-token authorized `memory_overview` still uses full overview. No-token `record_memory` and `search_memory` remain blocked.

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

CM-1258 does not close full no-token governance, write reliability, recall reliability, runtime readiness, RC readiness, production readiness, cutover readiness, or personal RC dogfood.
