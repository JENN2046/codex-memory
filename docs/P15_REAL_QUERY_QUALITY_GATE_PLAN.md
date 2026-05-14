# P15 Real Query Quality Gate Plan

## Purpose

P15 turns real query quality into a measurable standing gate.

This phase is planning only. It does not change search runtime behavior, provider configuration, public MCP tools, MCP schemas, import/export behavior, migration behavior, SQLite schema, or durable memory data.

The goal is to separate donor behavior parity from query quality. P14 proves donor-compatible behavior gates are stable; P15 must prove that user-facing query answers remain relevant, scoped, safe, and regression-testable.

## Current Baseline

The current local query-quality surface already has a fixture-only baseline:

- `npm run real-query-suite -- --json --fixture-recall-dry-run`
- `npm run query:quality -- --json --dry-run --fixture-recall-dry-run`

Observed baseline:

- `caseCount=14`
- `placeholderCount=0`
- `fixtureOnlyCount=14`
- `realCount=14`
- `assertedCount=14`
- `passedCount=14`
- `failedCount=0`
- `fixtureRecallDryRun.mutated=false`
- `fixtureRecallDryRun.providerCalls=0`
- `fixtureRecallDryRun.durableMemoryTouched=false`

This baseline is useful evidence, but it is not yet a full query quality program. It verifies sanitized fixture expectations and fixture recall behavior only.

## Query Quality Surfaces

P15 should plan and gate these surfaces:

- `real-query-suite` fixture cases
- `query:quality` JSON summary
- `gate:ci` query assertions
- fixture recall dry-run ranking
- scope-aware query relevance
- lifecycle-aware query visibility
- privacy-safe summaries
- negative assertions with `mustNotContain`
- failure reporting for drift, missing fixture targets, and invalid cases
- future real-memory dry-run preview, if separately approved

## Gate Categories

P15 quality gates should distinguish:

- relevance: expected target can be retrieved or asserted from fixture content
- precision: forbidden content does not appear in the target answer fixture
- scope safety: scoped queries do not leak cross-workspace or cross-client results
- lifecycle safety: proposal, rejected, superseded, or tombstoned records are not treated as ordinary active answers when policy gates apply
- privacy safety: raw secrets and raw low-risk `workspace_id` values are not exposed
- regression safety: fixture drift fails loudly instead of reporting fake quality scores
- report stability: `query:quality` JSON fields remain stable for CI and dashboards
- provider isolation: fixture gates never call provider smoke or provider benchmark

## Quality Signals

The first P15 gate should remain explicit and modest:

- count of runnable cases
- count of asserted cases
- passed and failed assertion counts
- fixture recall dry-run passed and failed counts
- invalid case count
- placeholder count
- source fixture coverage
- area/category coverage
- mutation and provider-call flags
- failure details that point to case id and target id

P15 should not invent a synthetic `hitRate` or `qualityScore` until the metric has a fixture definition and a failure threshold.

## Safety Rules

- Dry-run and fixture-first.
- `mutated=false` for query-quality reports.
- No provider smoke or provider benchmark in default P15 gates.
- No real DB, diary, vector index, audit log, or durable memory write.
- No broad export of real memory.
- No import/export apply.
- No SQLite migration or `ALTER TABLE`.
- No public MCP tool expansion.
- No `.env`, secret, provider key, or global config edits.
- No P16 TagMemo / semantic association work.
- No P17 V8 / advanced memory intelligence work.
- No UI, release, tag, or deploy.

## Donor And Object Model Boundaries

P15 may reveal that query quality regressions come from donor behavior, scope/lifecycle handling, or object-model drift.

When that happens:

- donor behavior drift must go back through P14-style targeted fixtures and compare/rollback gates
- object-model drift must update P13 fixtures before any object-model rewrite
- lifecycle or scope drift must use existing P11/P12/P13 boundaries before runtime changes
- query quality failures must not be fixed by weakening assertions

## Future Sequence

Recommended P15 sequence:

1. `P15.1-real-query-quality-fixture-inventory`
   - Inventory current query fixture coverage, areas, negative assertions, and missing quality dimensions.
   - Status: completed in [P15.1 Real Query Quality Fixture Inventory](./P15_REAL_QUERY_QUALITY_FIXTURE_INVENTORY.md).
2. `P15.2-real-query-quality-fixture-expansion`
   - Add targeted sanitized fixture cases for scope, lifecycle, privacy, and failure reporting gaps.
   - Status: completed in [P15.2 Real Query Quality Fixture Expansion](./P15_REAL_QUERY_QUALITY_FIXTURE_EXPANSION.md).
3. `P15.3-query-quality-report-shape-tests`
   - Lock JSON shape for CI, dashboard, and future standing gate consumers.
   - Status: completed in [P15.3 Query Quality Report Shape Tests](./P15_QUERY_QUALITY_REPORT_SHAPE_TESTS.md).
4. `P15.4-fixture-recall-dry-run-standing-gate`
   - Promote fixture recall dry-run summary into a documented standing gate.
   - Status: completed in [P15.4 Fixture Recall Dry-Run Standing Gate](./P15_FIXTURE_RECALL_DRY_RUN_STANDING_GATE.md).
5. `P15.5-real-memory-query-dry-run-planning`
   - Plan a read-only, redacted, opt-in dry-run against real local memory without provider calls or writes.
   - Status: completed in [P15.5 Real Memory Query Dry-Run Plan](./P15_REAL_MEMORY_QUERY_DRY_RUN_PLAN.md).
6. `P15.6-query-quality-closeout-review`
   - Summarize evidence, remaining risk, and readiness for P16 planning.

No P15 step should jump directly to provider benchmarks, runtime ranking changes, migration, import/export apply, P16, P17, V8, or UI.

## Validation Plan

Planning/docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Fixture/query validation for later P15 phases:

```powershell
node --test tests\real-query-suite.test.js tests\query-quality-report.test.js
npm run real-query-suite -- --json --fixture-recall-dry-run
npm run query:quality -- --json --dry-run --fixture-recall-dry-run
npm run gate:ci -- --json
npm test
```

Provider validation is explicitly out of scope unless a later phase receives explicit approval.

## Non-Goals

- no runtime query behavior change
- no provider smoke or provider benchmark
- no real memory mutation
- no SQLite migration
- no import/export apply
- no public MCP tool expansion
- no TagMemo / semantic association parity
- no V8 / advanced memory intelligence
- no UI
- no release, tag, or deploy

## Next Recommended Phase

`P15.6-query-quality-closeout-review`

P15.6 should summarize P15.1-P15.5 evidence, validation, remaining risks, and readiness for P16 planning. It should not start P16 implementation.
