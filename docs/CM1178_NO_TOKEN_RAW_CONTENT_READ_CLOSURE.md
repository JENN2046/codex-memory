# CM-1178 No-Token Raw Content Read Closure

Date: 2026-05-26

Status: `CM1178_NO_TOKEN_RAW_CONTENT_READ_CLOSURE_VALIDATED_NOT_READY`

## Summary

CM-1178 closes the first raw-content gap in the no-token HTTP read path.

The HTTP JSON-RPC boundary now rejects no-token `search_memory` calls when `arguments.include_content === true`.

This keeps no-token `search_memory` limited to metadata/snippet-style readonly output and prevents no-token callers from requesting raw memory content through the public HTTP MCP surface.

## Validation

Passed:

```text
node --check src\adapters\codex-mcp\http.js
node --check tests\mcp-http.test.js
node --test tests\mcp-http.test.js
node --test tests\mcp-http.test.js tests\mcp-contract.test.js tests\phase-a-services.test.js
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
npm test
```

Targeted HTTP tests passed `18/18`.
Adjacent HTTP/contract/service tests passed `35/35`.
Full `npm test` passed `2787/2787` on rerun after one `124s` timeout without a pass/fail summary.

The new regression proves no-token `search_memory` with `include_content=true` returns HTTP `403` before tool execution.

Existing no-token regressions continue to prove no-token `search_memory` avoids local sync, candidate cache get/set, recall audit, read-policy audit, embedding-cache flush, external embedding provider, and external rerank provider calls.

## Boundary

This does not change public MCP tools or schemas.

This does not change authorized bearer-token `search_memory` behavior.

This does not touch real memory stores, raw `.jsonl`, provider/API credentials, config, watchdog, startup, dependencies, migration/import/export/backup/restore, tag/release/deploy, or cutover.

This does not prove general recall quality, full no-token governance closure, write reliability, recall reliability, runtime readiness, production readiness, or `RC_READY`.

## Remaining

- Confirm whether no-token `memory_overview` needs additional selected-output hardening.
- SQLite schema migration/version startup gate remains open.
- Startup explicit rebuild/recovery policy remains open.
- Lifecycle remains timestamp/counter based, not a full transition log.
