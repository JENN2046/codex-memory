# Phase F Fixture/Test-Only Parity Hardening Matrix

Status: `FIXTURE_TEST_ONLY_MATRIX_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `2971e58245b6c850160c43ca6fdb587f1b1316b3`

Workspace: `A:\codex-memory`

Branch: `main`

## Purpose

Define the fixture/test-only hardening matrix for Phase F VCP full-memory parity work. This document turns the readonly gap inventory into concrete future fixture/test categories, while deliberately avoiding runtime implementation, live recall observation, real memory scans, provider calls, public MCP expansion, and readiness claims.

## Source Boundary

This matrix follows the local-safe route from:

- [docs/PHASE_F_LOCAL_SAFE_PREP.md](/A:/codex-memory/docs/PHASE_F_LOCAL_SAFE_PREP.md)
- [docs/PHASE_F_READONLY_VCP_PARITY_GAP_INVENTORY.md](/A:/codex-memory/docs/PHASE_F_READONLY_VCP_PARITY_GAP_INVENTORY.md)
- [docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)

No source, runtime, test, fixture, provider, memory-store, HTTP runtime, migration, config, or dependency file is changed by this matrix slice.

## Matrix Overview

| Matrix ID | Parity Area | Fixture/Test Intent | Safe First Artifact | Required Later Validation | Blocked Boundary |
|---|---|---|---|---|---|
| F-MX-01 | TagMemo association strength | Define synthetic memories with explicit tag, topic, relation, and association-strength expectations. | fixture schema draft and acceptance notes | fixture JSON parse; targeted fixture test when created | real recall observation, provider-backed embeddings/rerank, runtime ranking changes |
| F-MX-02 | Semantic grouping and query expansion | Define query families that should group semantically related memories without over-broad expansion. | fixture matrix rows for query intent and expected candidate class | targeted fixture test; compare category when implemented | broad memory scan, provider call, live search_memory observation |
| F-MX-03 | EPA / ResidualPyramid interaction | Define explicit-input scenarios for multi-stage recall influence and forbidden overclaim cases. | helper/test plan only | helper syntax and no-touch regression when code exists | executing real recall chain or reading audit/runtime stores |
| F-MX-04 | Deterministic ordering and tie-breakers | Define stable ordering fixtures for equal score, recency, topic, and donor-style tie cases. | ordering fixture plan | targeted ordering tests; compare/rollback category when implemented | changing runtime ordering without targeted tests and gate |
| F-MX-05 | DeepMemo / TopicMemo donor edge maintenance | Inventory donor edge cases that need fixture-backed standing coverage. | docs-only edge-case table | CLI fixture tests; compare/rollback when implemented | donor contract change without explicit compatibility review |
| F-MX-06 | Query-quality dry-run confidence | Separate fixture-only quality signals from provider-backed quality evidence. | dry-run quality matrix | `real-query-suite -- --fixture-recall-dry-run` only when intentionally scoped | provider benchmark/smoke, real broad scan |
| F-MX-07 | Governance/lifecycle parity fixtures | Define proposal, rejected, superseded, tombstoned, stale, and forget-flow fixture states. | lifecycle/governance fixture plan | lifecycle/policy fixture tests when implemented | durable governance writes, real governance report execution, public write tools |
| F-MX-08 | Object-model and migration dry-run parity | Define import/export-safe object fields and dry-run-only migration fixture expectations. | object-model fixture checklist | migration dry-run fixture tests only | import/export/backup/restore apply, real migration |
| F-MX-09 | Observability/admin report shape | Define Markdown/JSON review surface expectations and schema guard categories. | report-shape fixture plan | schema snapshot tests when implemented | public MCP expansion, live HTTP operation, config/watchdog/startup |
| F-MX-10 | Client-scope parity | Define Codex/Claude visibility, private leakage, and scope-policy fixture cases. | client-scope acceptance checklist | scope acceptance tests when implemented | real client config mutation or cross-client live validation |

## First Fixture/Test-Only Slice Recommendation

Start with `F-MX-01` through `F-MX-04` as a TagMemo / semantic association fixture pack. This is the highest-value local-safe route because it aligns with the roadmap's P16 focus while staying synthetic and reversible.

Suggested next task:

```text
CM-0529 Phase F TagMemo semantic association fixture plan
```

## Proposed TagMemo Fixture Pack Shape

Future fixture/test artifacts should be planned before implementation. Candidate shape:

```text
tests/fixtures/phase-f-tagmemo-semantic-association-v1.json
tests/phase-f-tagmemo-semantic-association-fixture.test.js
docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_PLAN.md
```

The fixture pack should cover:

- explicit tag association strength
- topic co-membership
- semantic neighbor expansion
- blocked over-expansion cases
- EPA / ResidualPyramid influence metadata as explicit input only
- deterministic ordering and tie-breaker cases
- intentional donor differences
- forbidden readiness and runtime-evidence claims

## Acceptance Criteria For This Matrix Slice

This slice is complete when:

- Matrix categories are documented.
- The next fixture/test-only slice is named.
- `.agent_board/TASK_QUEUE.md` routes from `CM-0526` to the next safe task.
- Current state remains `NOT_READY_BLOCKED`.
- Validation passes: `git diff --check` and docs validation.

## Explicit Non-Goals

This matrix does not:

- add or modify fixture files
- add or modify tests
- change source/runtime behavior
- run `npm test`, strict gate, HTTP observe, compare, rollback, provider smoke, or benchmark
- observe real recall paths
- read diary, SQLite, vector index, candidate cache, or recall audit
- mutate durable memory or audit logs
- expand public MCP tools
- modify config/watchdog/startup or `.env`
- push, tag, release, deploy, or cut over
- declare `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness

## Result

`CM-0526` completes as a docs-only fixture/test-only parity hardening matrix. The project remains:

```text
NOT_READY_BLOCKED
```
