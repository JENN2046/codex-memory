# P15.2 Real Query Quality Fixture Expansion

## Purpose

P15.2 expands the fixture-only query quality baseline with targeted sanitized cases for the gaps identified in P15.1.

This phase changes only fixture data, tests, docs, and board state. It does not change search runtime behavior, ranking code, provider configuration, public MCP tools, MCP schemas, import/export apply behavior, SQLite schema, durable memory data, or `validate_memory` mutation surface.

## Baseline Change

Before P15.2:

- default query suite: `8` cases
- default dataset: `8` sanitized documents
- fixture recall dry-run: `8/8`

After P15.2:

- default query suite: `14` cases
- default dataset: `15` sanitized documents
- fixture recall dry-run: `14/14`
- `query:quality`: `14/14`
- `mutated=false`
- `providerCalls=0`
- `durableMemoryTouched=false`

## Added Coverage

P15.2 adds six query cases:

| Case | Area | Target | Purpose |
|---|---|---|---|
| `rq-009` | `scope-safety` | `scope_private_boundary` | Same-client private memory must not leak into cross-client recall expectations. |
| `rq-010` | `lifecycle-safety` | `lifecycle_visibility_policy` | Active/stale visibility and proposal/rejected/superseded/tombstoned exclusion under lifecycle policy. |
| `rq-011` | `privacy-safety` | `privacy_redaction_boundary` | Redacted summaries and no raw secret material in query quality output. |
| `rq-012` | `privacy-safety` | `workspace_summary_boundary` | Low-risk workspace summaries and no raw workspace identifier exposure. |
| `rq-013` | `precision` | `precision_false_positive_target` | Near-neighbor false-positive protection using a distractor document. |
| `rq-014` | `report-shape` | `query_quality_report_shape` | Stable report fields without synthetic `hitRate` or `qualityScore`. |

P15.2 also adds one near-neighbor distractor document:

- `precision_false_positive_neighbor`

That document has no matching query and exists only to make `rq-013` harder.

## Test Coverage

Updated tests:

- `tests/real-query-suite.test.js`
  - verifies P15.2 areas are present
  - verifies P15.2 targets are present
  - verifies sanitized/no-side-effect fixture boundaries
  - continues verifying default suite coverage of every dataset query
- `tests/query-quality-report.test.js`
  - verifies expanded report counts are `14/14`
  - verifies `mutated=false`
  - verifies fixture recall dry-run remains no-provider and no-durable-memory

## Safety Boundaries

Confirmed boundaries for this phase:

- no `src/` changes
- no package or lockfile changes
- no public MCP tool expansion
- no public `validate_memory` MCP tool
- no `validate_memory` mutation-surface expansion
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no real DB, diary, vector index, audit log, or durable memory write
- no provider smoke or provider benchmark
- no release, tag, deploy, or push without separate authorization

## Validation

Required validation:

```powershell
node --test tests\real-query-suite.test.js tests\query-quality-report.test.js
npm run real-query-suite -- --json --fixture-recall-dry-run
npm run query:quality -- --json --dry-run --fixture-recall-dry-run
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

`P15.3-query-quality-report-shape-tests`

P15.3 should lock report JSON fields for CI/dashboard consumers without adding synthetic quality scores or changing runtime behavior.
