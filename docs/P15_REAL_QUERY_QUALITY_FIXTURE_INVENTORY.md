# P15.1 Real Query Quality Fixture Inventory

## Purpose

P15.1 inventories the current real-query fixture coverage before adding new fixture cases or changing any query quality gate behavior.

This phase is docs/board inventory only. It does not change search runtime behavior, provider configuration, public MCP tools, MCP schemas, import/export behavior, migration behavior, SQLite schema, durable memory data, or `validate_memory` mutation surface.

## Baseline

Current Git baseline:

- current main commit: `514bd6f docs: reconcile p14 p15 state after safety patch`
- latest runtime safety baseline: `41a5630 fix: add validate memory two phase audit`
- `validate_memory` remains internal-only
- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`

Current fixture validation:

```powershell
npm run real-query-suite -- --json --fixture-recall-dry-run
npm run query:quality -- --json --dry-run --fixture-recall-dry-run
```

Observed result:

- `caseCount=8`
- `invalidCount=0`
- `placeholderCount=0`
- `fixtureOnlyCount=8`
- `realCount=8`
- `assertedCount=8`
- `passedCount=8`
- `failedCount=0`
- `fixtureRecallDryRun.enabled=true`
- `fixtureRecallDryRun.mutated=false`
- `fixtureRecallDryRun.providerCalls=0`
- `fixtureRecallDryRun.durableMemoryTouched=false`
- `fixtureRecallDryRun.passedCount=8`
- `fixtureRecallDryRun.failedCount=0`

## Source Files

- suite: `benchmarks/real-query-suite/v1.json`
- dataset: `benchmarks/default-dataset.json`
- runner: `src/cli/real-query-suite-core.js`
- suite CLI: `src/cli/real-query-suite.js`
- report CLI: `src/cli/query-quality-report.js`
- tests:
  - `tests/real-query-suite.test.js`
  - `tests/query-quality-report.test.js`

## Current Dataset Inventory

The default dataset currently contains 8 sanitized documents and 8 matching queries.

| Document id | Covered by case | Area |
|---|---|---|
| `memory_overview` | `rq-001` | observability |
| `dual_write_shadow` | `rq-002` | storage |
| `candidate_cache` | `rq-003` | recall |
| `context_vector` | `rq-004` | recall |
| `rerank_providers` | `rq-005` | provider-profile |
| `embedding_providers` | `rq-006` | provider-profile |
| `diary_vectors` | `rq-007` | recall |
| `provider_smoke` | `rq-008` | provider-profile |

## Current Case Coverage

| Case | Area | Target | Positive assertions | Negative assertions | Fixture recall |
|---|---|---|---:|---:|---|
| `rq-001` | observability | `memory_overview` | 3 | 1 | passes |
| `rq-002` | storage | `dual_write_shadow` | 3 | 1 | passes |
| `rq-003` | recall | `candidate_cache` | 3 | 1 | passes |
| `rq-004` | recall | `context_vector` | 3 | 1 | passes |
| `rq-005` | provider-profile | `rerank_providers` | 3 | 1 | passes |
| `rq-006` | provider-profile | `embedding_providers` | 3 | 1 | passes |
| `rq-007` | recall | `diary_vectors` | 3 | 1 | passes |
| `rq-008` | provider-profile | `provider_smoke` | 3 | 1 | passes |

Current assertion totals:

- positive `mustContain` assertions: 24
- negative `mustNotContain` assertions: 8
- all default dataset queries are covered by suite cases
- all suite cases point at an existing fixture document
- all suite cases are fixture-only and sanitized

## Covered Quality Dimensions

Current coverage is useful but narrow:

- basic relevance: present, through expected target documents and `mustContain`
- basic precision: present, through one `mustNotContain` per case
- fixture recall ranking: present, through token-based fixture recall dry-run
- report no-write behavior: present, through `mutated=false`
- provider isolation: present, through `providerCalls=0`
- durable memory isolation: present, through `durableMemoryTouched=false`
- invalid suite handling: covered in CLI tests with temporary broken fixtures
- fixture expectation drift: covered in CLI tests with temporary broken fixtures
- fake metric prevention: `query:quality` does not expose `hitRate` or `qualityScore`

## Missing Quality Dimensions

The current default suite does not yet cover:

- scope safety queries, such as same-client versus cross-client or same-workspace versus cross-workspace expectations
- lifecycle visibility queries, such as active/stale included and proposal/rejected/superseded/tombstoned excluded when policy applies
- privacy safety queries that assert raw secrets are not exposed
- low-risk summary boundary queries that assert raw `workspace_id` is not exposed
- ambiguous or multi-candidate queries that verify deterministic tie-breaker behavior
- negative assertions that target likely false-positive documents instead of only broad unrelated phrases
- report-shape stability for future dashboard or CI consumers beyond the current CLI tests
- failure-detail fixture cases in the default suite; broken-suite coverage currently lives only in tests
- multilingual or alias-style user wording
- future real-memory dry-run preview

## P15.2 Recommended Fixture Expansion

The next fixture phase should stay sanitized and dry-run-first. Recommended first batch:

1. Scope safety fixture cases.
   - Add same-client and cross-client synthetic documents.
   - Assert scoped query does not retrieve or summarize cross-scope content.
   - Keep raw `workspace_id` out of expected output and summaries.

2. Lifecycle visibility fixture cases.
   - Add active, stale, proposal, rejected, superseded, and tombstoned synthetic documents.
   - Assert policy-enabled expectations hide inactive lifecycle states.
   - Keep default-off runtime behavior unchanged.

3. Privacy safety fixture cases.
   - Add redacted synthetic secret-like markers only as safe placeholders.
   - Assert raw secret-like content is not surfaced.

4. Precision and false-positive fixture cases.
   - Add near-neighbor documents that share vocabulary with the target.
   - Strengthen `mustNotContain` to catch plausible wrong answers.

5. Report shape fixture cases.
   - Lock JSON fields required by `gate:ci`, future dashboard summaries, and CI consumers.
   - Continue avoiding synthetic quality scores until thresholds are defined.

## Safety Boundaries

P15.1 and the recommended P15.2 follow-up must not:

- change `search_memory` runtime behavior
- change ranking, reranking, embeddings, or provider selection
- call provider smoke or provider benchmark
- write real DB, diary, vector index, audit log, or durable memory data
- run SQLite migration or `ALTER TABLE`
- change import/export behavior
- change package dependencies or lockfiles
- expand public MCP tools
- expose public `validate_memory` MCP tool
- expand `validate_memory` mutation surface
- enter P16, P17, V8, UI, release, tag, or deploy work

## Decision

P15.1 finds the current query fixture baseline healthy but incomplete. The right next step is `P15.2-real-query-quality-fixture-expansion`, focused on sanitized scope, lifecycle, privacy, precision, and report-shape fixtures.
