# P19.1 Observability / Admin Review Surface Inventory

Phase: `P19.1-observability-admin-review-surface-inventory`

Status: inventory

## Goal

Inventory the existing read-only observability and review surfaces before adding any new fixture shape or schema gate.

This phase does not implement a UI, does not change runtime behavior, and does not read real memory previews.

## Current Surfaces

| Surface | Entry | Current review value | Existing guard |
|---|---|---|---|
| Dashboard | `npm run dashboard`; `npm run dashboard -- --json`; `npm run dashboard -- --json --summary-only` | Combines service, store, profile, runtime, bridge/recall audit, read policy, governance, mainline gate, checks, and recommendations. | `tests/dashboard-cli.test.js` locks top-level sections, summary-only shape, read-policy fields, governance counts, and raw `workspace_id` absence. |
| HTTP observe | `npm run observe:http -- --json` | Explains HTTP health, config summary, log snapshots, write audit, recall audit, read-policy summary, governance summary, and hints. | `tests/http-observe-cli.test.js` locks summary keys, audit key sets, governance/read-policy fields, scope counts, and raw workspace boundary. |
| Governance report | `npm run governance:report -- --json` | Summarizes proposal, tombstone, supersession, stale records, scope coverage, read policy, and review hints. | `tests/governance-report-cli.test.js` locks JSON/text/error shapes and read-policy safety flags. |
| CI fixture gate | `npm run gate:ci -- --json` | CI-safe fixture-only summary for compare, rollback, query recall, policy preflight, lifecycle policy, tests, and docs. | `tests/gate-ci-cli.test.js` locks top-level keys and fixture-only `mutated=false`, `noProvider=true`, and raw workspace boundary fields. |
| Mainline gate | `npm run gate:mainline` | Local health, compare, and rollback readiness signal. | Mainline gate tests and active-memory compare/rollback suite protect the local operational gate. |

## Shape Coverage

| Concern | Covered by | Current status |
|---|---|---|
| Top-level dashboard sections | `dashboard-cli.test.js` | Covered. |
| Dashboard summary-only mode | `dashboard-cli.test.js` | Covered. |
| Read-policy low-risk fields | `dashboard-cli.test.js`; `http-observe-cli.test.js`; `governance-report-cli.test.js`; `gate-ci-cli.test.js` | Covered. |
| Raw `workspace_id` not exposed | dashboard / observe / governance / gate-ci tests | Covered for existing surfaces. |
| Governance counts and hints | dashboard / observe / governance tests | Covered. |
| Recall audit scope summaries | dashboard / observe tests | Covered. |
| Write audit summaries | http-observe tests | Covered. |
| Fixture-only query / policy / lifecycle safety | gate-ci tests | Covered. |
| Import/export/migration blocked status as admin-review signal | P18 docs only | Gap. |
| Unified admin-review JSON shape | P19 planning only | Gap. |
| Admin review malformed/unavailable source shape | Partial, surface-specific | Gap. |
| Operator troubleshooting taxonomy | Existing docs, scattered | Gap. |

## Existing Safety Flags

Current surfaces already expose or enforce these low-risk signals:

- `destructive=false` on dashboard
- `mutated=false` in read-policy and fixture-only gates
- `noProvider=true` in read-policy and fixture gates
- `migrationApplied=false`
- `rawWorkspaceIdExposed=false`
- `fixtureOnly=true` in `gate:ci`
- `noNetwork=true` and `noDaemon=true` in `gate:ci`

P19 should keep these as review-surface invariants.

## Inventory Findings

1. Existing observability is already read-only and useful, but fragmented by command.
2. JSON key-set tests exist for dashboard, http-observe, governance-report, and gate-ci.
3. The current review surfaces explain lifecycle, scope, audit, and governance without exposing raw `workspace_id`.
4. P18 import/export/migration safety blockers are documented but not yet represented as a first-class review signal.
5. A combined admin-review shape should be fixture-backed before any runtime aggregation is considered.
6. UI remains premature; the next safe move is a synthetic admin-review fixture shape test.

## Recommended P19.2 Fixture Shape

The next safe phase should add a synthetic fixture and tests for a combined admin review shape:

- `tests/fixtures/admin-review-surface-v1.json`
- `tests/admin-review-surface-shape.test.js`
- `docs/P19_ADMIN_REVIEW_SURFACE_SHAPE_TESTS.md`

The fixture should cover:

- `mode="admin-review"`
- `destructive=false`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`
- `realMemoryPreview=false`
- public MCP tools frozen
- dashboard / observe / governance / gate-ci source refs
- import/export/migration blocked summary
- read-policy summary
- lifecycle/scope/audit/governance signals
- unavailable source shape
- redaction flags
- forbidden raw secrets and raw `workspace_id`

## Boundaries

P19.1 does not authorize:

- UI implementation
- runtime aggregation changes
- provider calls
- real memory preview
- durable DB or memory mutation
- SQLite migration or `ALTER TABLE`
- import/export apply
- public MCP tool expansion
- MCP schema change
- public `validate_memory`
- package or lockfile changes
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

`P19.2-admin-review-surface-shape-tests`
