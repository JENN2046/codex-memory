# CM-1255 No-Token Memory Overview Selected Projection

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1255 implements a narrow no-token HTTP `memory_overview` selected projection.

This is local runtime HTTP boundary hardening only. It does not change public MCP tool names, execute provider calls, call MCP tools outside local tests, read broad real memory, write durable memory/audit state, change config/watchdog/startup, run migration/import/export/backup/restore, push, deploy, cut over, or claim readiness.

## Result

Updated:

- `src/core/MemoryOverviewService.js`
- `src/app.js`
- `src/adapters/codex-mcp/http.js`
- `tests/http-no-token-search-rejection.test.js`
- `tests/mcp-http.test.js`

No-token HTTP JSON-RPC `tools/call` for `memory_overview` now returns `no_token_selected_overview` instead of requiring a bearer token.

The selected projection bypasses full `MemoryOverviewService.getOverview(...)` and omits:

- paths
- embedding fingerprint
- recent audit rows
- recent files
- memory links
- recent recall rows
- memory ids
- titles
- file paths
- source files

Bearer-token authorized `memory_overview` still uses the full overview path.

`record_memory` no-token calls remain blocked. `search_memory` no-token calls remain blocked, including raw-content requests.

## Validation

Passed:

```powershell
node --check src\core\MemoryOverviewService.js
node --check src\app.js
node --check src\adapters\codex-mcp\http.js
node --test tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js tests\phase-b-sync-cache-rerank.test.js
npm test
npm run test:hardening
```

Targeted and adjacent result: `44/44`.

Default test result: `2782/2782`.

Hardening result: `73/73` plus override evidence `6/6`; fixture-only `gate:ci` PASS.

## Interpretation

CM-1255 closes the no-token `memory_overview` selected-output implementation slice.

Still not proven:

- full no-token governance closure
- no-token `search_memory` selected projection
- production readiness
- write reliability
- recall reliability
- RC readiness

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
