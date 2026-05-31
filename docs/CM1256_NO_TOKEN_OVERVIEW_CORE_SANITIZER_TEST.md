# CM-1256 No-Token Overview Core Sanitizer Test

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Test/docs-only hardening for the no-token `memory_overview` selected projection.

Changed files:

- `tests/memory-overview-no-token-selected-projection.test.js`
- `docs/CM1256_NO_TOKEN_OVERVIEW_CORE_SANITIZER_TEST.md`
- `STATUS.md`
- `.agent_board/*`

No runtime implementation, provider call, real-memory scan, durable memory/audit write, config/watchdog/startup change, public MCP expansion, remote action, readiness claim, or reliability claim is included in CM-1256.

## Result

CM-1256 adds a direct unit test for `MemoryOverviewService.getNoTokenSelectedOverview(...)`.

The test feeds the core overview service with dependency outputs containing sensitive or full-overview-only material:

- paths
- `memoryId` / `memoryIds`
- titles
- file paths
- source files
- embedding fingerprints
- scope project/client ids
- candidate-cache revision targets
- schema-gate DB path metadata

The selected no-token projection is then asserted to keep only sanitized summary/health fields and omit full-overview fields such as `paths`, `embeddingProfile`, `recentAudit`, `recentFiles`, `memoryLinks`, recall `recent`, raw memory identifiers, titles, file/source paths, DB paths, and embedding fingerprints.

The test also asserts that the no-token selected overview does not call `diaryStore.listRecentFiles(...)`, because recent diary files are full-overview-only output.

## Validation

Planned and/or executed validation for this slice:

```powershell
node --check tests\memory-overview-no-token-selected-projection.test.js
node --test tests\memory-overview-no-token-selected-projection.test.js
node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-no-token-search-rejection.test.js tests\mcp-http.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Non-Claims

CM-1256 does not close full no-token governance, write reliability, recall reliability, runtime readiness, RC readiness, production readiness, cutover readiness, or personal RC dogfood.

No-token `record_memory` and `search_memory` remain blocked.
