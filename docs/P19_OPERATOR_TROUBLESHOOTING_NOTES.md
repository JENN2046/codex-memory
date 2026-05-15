# P19.4 Operator Troubleshooting Notes

Phase: `P19.4-operator-troubleshooting-notes`

Status: docs

## Goal

Give an operator a compact troubleshooting map for the existing read-only review surfaces before any runtime aggregation or UI work.

This phase documents safe interpretation only. It does not implement a new command, UI, MCP tool, provider call, real-memory preview, import/export apply, or migration.

## Review Surfaces

| Surface | Use first when | Safe next action |
|---|---|---|
| `npm run dashboard -- --json` | The operator needs a local all-up health and governance summary. | Read `summary`, `governance`, `readPolicy`, `scope`, and recommendations; do not mutate memory from this output. |
| `npm run observe:http -- --json` | HTTP MCP health, logs, write audit, or recall audit need review. | Inspect status and hints; rerun local gates if needed. Do not change config from the report alone. |
| `npm run governance:report -- --json` | Proposal, stale, tombstone, supersession, or read-policy counts need review. | Treat hints as manual review prompts; lifecycle writes still require approved controlled paths. |
| `npm run gate:ci -- --json` | CI-safe fixture policy, lifecycle, query-quality, and safety summaries need review. | Use as fixture-backed signal only; it is not proof of provider quality or real-memory recall quality. |
| `npm run gate:mainline` | Local health, donor compare, and rollback readiness need review. | Use as local operational gate; failures should be investigated before runtime or release work. |

## Review Levels

| Level | Meaning | Operator response |
|---|---|---|
| `nominal` | Expected read-only signals are present and no blocker is visible. | Continue the planned safe phase. |
| `observe` | A source is available but has warnings or incomplete coverage. | Record the warning, rerun the narrow local gate, and avoid broad runtime work. |
| `needs-review` | Governance, scope, lifecycle, audit, or blocked-state signals need human interpretation. | Open the relevant docs and fixture evidence; do not apply lifecycle/import/export/migration actions. |
| `blocked` | The next action crosses a hard boundary or lacks required approval. | Stop and prepare an A5 approval packet if the work is still needed. |
| `unavailable` | A source could not be read or is intentionally absent in fixture mode. | Treat the signal as missing evidence, not as success. |

## Common Signals

| Signal | Likely cause | Safe response |
|---|---|---|
| `providerCalls=0` with missing provider quality data | Fixture-only or read-only gate did not call an external provider. | Do not invent `hitRate`, `qualityScore`, or latency claims. Provider smoke/benchmark remains explicit-approval work. |
| `mutated=false` | Surface is read-only or dry-run-only. | Keep the result as review evidence only. Do not infer that a change was applied. |
| `durableMemoryTouched=false` | Fixture/dry-run review did not touch durable memory. | Safe for docs/test evidence; not proof of real store behavior. |
| `realMemoryPreview=false` | No real local memory snippets were read or shown. | Keep privacy boundary intact; real preview remains opt-in and approval-sensitive. |
| `migrationBlocked=true` or import/export apply blocked | P18 safety rail is working as intended. | Do not create backup, restore, apply import/export, or migrate without A5 approval. |
| `rawWorkspaceIdExposed=false` | Review surface is using low-risk summaries. | Keep raw workspace identifiers out of docs, logs, and reports. |
| `rawSecretExposed=false` | Redaction boundary held. | Do not paste secrets or raw `.env` values into follow-up notes. |

## Troubleshooting Flow

1. Start with `dashboard -- --json` for broad local state.
2. If HTTP or audit signals look suspicious, inspect `observe:http -- --json`.
3. If lifecycle or governance counts are the concern, inspect `governance:report -- --json`.
4. If fixture policy/query evidence is the concern, inspect `gate:ci -- --json`.
5. If local operational readiness is the concern, inspect `gate:mainline`.
6. If any source is `blocked`, `unavailable`, or contradictory, stop expansion and record the missing evidence.

## Hard Boundaries

These notes do not authorize:

- UI implementation
- runtime aggregation changes
- provider calls
- provider smoke or benchmark
- real memory preview
- durable DB or memory mutation
- SQLite migration or `ALTER TABLE`
- import/export apply
- backup creation or restore
- MCP schema/tool change
- public MCP expansion
- public `validate_memory`
- package or lockfile change
- release, tag, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Validation

Docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P19.x-observability-admin-review-surface-closeout`
