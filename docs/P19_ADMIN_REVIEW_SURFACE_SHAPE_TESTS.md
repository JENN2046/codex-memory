# P19.2 Admin Review Surface Shape Tests

Phase: `P19.2-admin-review-surface-shape-tests`

Status: fixture/test

## Goal

Add a synthetic fixture and targeted tests for a combined admin review surface before any runtime aggregation or UI work.

This phase locks the expected shape only. It does not implement a new CLI, UI, MCP tool, provider call, or real-memory preview.

## Added Evidence

| File | Purpose |
|---|---|
| `tests/fixtures/admin-review-surface-v1.json` | Synthetic admin review surface fixture. |
| `tests/admin-review-surface-shape.test.js` | Shape, source, signal, safety, and forbidden-claim tests. |

## Shape Locked

The fixture locks:

- `mode="admin-review"`
- `destructive=false`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`
- public MCP tools frozen at `record_memory`, `search_memory`, `memory_overview`
- source refs for dashboard, `observe:http`, `governance:report`, `gate:ci`, and `gate:mainline`
- governance, audit, lifecycle, scope, service, store, and import/export/migration review signal slots
- unavailable-source safe shape
- redaction and no-side-effect safety flags
- no fake `hitRate`, fake `qualityScore`, provider latency claim, or production memory snippet

## Boundaries

Confirmed scope:

- no `src/` runtime changes
- no runtime aggregation implementation
- no UI
- no provider calls
- no real memory preview
- no durable DB or memory mutation
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no MCP schema/tool change
- no public MCP expansion
- no public `validate_memory`
- no package or lockfile change
- no release, tag, or deploy

## Validation

Required validation:

```powershell
node --test tests\admin-review-surface-shape.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P19.3-admin-review-schema-snapshot-gate`
