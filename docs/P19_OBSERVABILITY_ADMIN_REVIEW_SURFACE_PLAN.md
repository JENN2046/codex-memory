# P19 Observability / Admin Review Surface Plan

Phase: `P19-observability-admin-review-surface-planning`

Status: planning

## Goal

P19 improves local review surfaces for an operator or agent reviewer without prematurely building a UI.

The target is a stable, read-only admin review layer that can explain memory health, governance signals, audit visibility, lifecycle state, and safety blockers before any future control surface is considered.

P19 is not a runtime tuning phase and not a UI phase.

## Current Baseline

Existing read-only surfaces:

| Surface | Current role |
|---|---|
| `npm run dashboard` | Local dashboard summary with service, store, audit, governance, profile, and gate signals. |
| `npm run observe:http -- --json` | HTTP runtime, log, recall audit, and scope/lifecycle observability summary. |
| `npm run governance:report -- --json` | Read-only governance summary for proposals, tombstones, supersession, stale records, and read-policy review. |
| `npm run gate:ci -- --json` | CI-safe fixture-only policy, lifecycle, query-quality, and safety summaries. |
| `npm run gate:mainline` | Local mainline health gate for health, compare, and rollback readiness. |

Existing docs:

- [MEMORY_DASHBOARD_REPORT_DESIGN.md](/A:/codex-memory/docs/MEMORY_DASHBOARD_REPORT_DESIGN.md)
- [runtime-policy-gates.md](/A:/codex-memory/docs/runtime-policy-gates.md)
- [POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md](/A:/codex-memory/docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md)
- [SCOPE_ACCEPTANCE.md](/A:/codex-memory/docs/SCOPE_ACCEPTANCE.md)
- [P18_IMPORT_EXPORT_MIGRATION_SAFETY_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P18_IMPORT_EXPORT_MIGRATION_SAFETY_CLOSEOUT_REVIEW.md)

## Review Questions

P19 should help answer:

- Are public MCP contracts still frozen and healthy?
- Are lifecycle / scope / governance summaries visible without exposing raw `workspace_id`?
- Are proposals, tombstones, supersession, stale records, and policy-hidden records reviewable as counts and hints?
- Are import/export/migration safety blockers visible as blocked status, not hidden operational debt?
- Are audit surfaces sufficient to explain recent write and recall behavior without exposing secrets?
- Can JSON/Markdown/text outputs be schema-locked before any richer local review surface is attempted?

## Planned Subphases

| Phase | Target | Allowed work | Validation |
|---|---|---|---|
| P19 planning | This plan and board/status handoff | docs/status/board only | `git diff --check`; docs validation |
| P19.1 inventory | Inventory dashboard / observe / governance / gate outputs and schema coverage | docs/status/board only | `git diff --check`; docs validation |
| P19.2 shape fixtures | Synthetic admin-review fixture shape for combined review summaries | fixtures/tests/docs only | targeted node test; `npm test`; diff/docs validation |
| P19.3 schema snapshot gate | Lock dashboard / observe / governance JSON key sets relevant to admin review | targeted tests/docs only | dashboard/http-observe/governance tests; `npm test` |
| P19.4 operator troubleshooting notes | Document review levels, blocked states, and safe next actions | docs only | diff/docs validation |
| P19.x closeout | Summarize P19 evidence and P20 readiness | docs/status/board only | diff/docs validation |

## Initial Admin Review Shape

A future combined review summary should stay read-only and low-risk:

```json
{
  "mode": "admin-review",
  "destructive": false,
  "mutated": false,
  "providerCalls": 0,
  "durableMemoryTouched": false,
  "realMemoryPreview": false,
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "review": {
    "status": "ok | warn | blocked | unavailable",
    "level": "nominal | observe | needs-review | blocked",
    "signals": {
      "service": {},
      "store": {},
      "governance": {},
      "audit": {},
      "lifecycle": {},
      "scope": {},
      "importExportMigration": {}
    },
    "hints": []
  },
  "safety": {
    "rawWorkspaceIdExposed": false,
    "rawSecretExposed": false,
    "redactionApplied": true,
    "mcpSchemaChanged": false,
    "publicMcpExpanded": false,
    "migrationApplied": false,
    "importExportApplied": false
  }
}
```

This is a planning shape, not an implemented public API.

## Boundaries

P19 planning does not authorize:

- UI implementation
- provider calls
- provider smoke or benchmark
- real memory preview
- import/export apply
- backup creation or restore
- SQLite migration or `ALTER TABLE`
- durable DB or memory mutation
- public MCP tool expansion
- MCP schema change
- public `validate_memory`
- dependency or lockfile changes
- release, tag, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Validation Plan

Docs-only P19 planning:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future P19 tests/fixtures:

```powershell
node --test tests\admin-review-surface-shape.test.js
node --test tests\dashboard-cli.test.js tests\http-observe-cli.test.js tests\governance-report-cli.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P19.1-observability-admin-review-surface-inventory`
