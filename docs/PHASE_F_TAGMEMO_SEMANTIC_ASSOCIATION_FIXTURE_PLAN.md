# Phase F TagMemo Semantic Association Fixture Plan

Status: `FIXTURE_PLAN_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `55cd41e0efaa97c337d30372a7a7a7aae751b47f`

Workspace: `A:\codex-memory`

Branch: `main`

## Purpose

Plan the first concrete Phase F fixture/test-only slice for TagMemo and semantic association parity. This document defines future synthetic fixture coverage before any fixture, test, source, or runtime change is made.

## Source Boundary

This plan follows:

- [docs/PHASE_F_READONLY_VCP_PARITY_GAP_INVENTORY.md](/A:/codex-memory/docs/PHASE_F_READONLY_VCP_PARITY_GAP_INVENTORY.md)
- [docs/PHASE_F_FIXTURE_TEST_ONLY_PARITY_HARDENING_MATRIX.md](/A:/codex-memory/docs/PHASE_F_FIXTURE_TEST_ONLY_PARITY_HARDENING_MATRIX.md)
- [docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)

This slice does not add fixture files or tests. It only defines the future fixture/test contract.

## Proposed Future Artifacts

```text
docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_TESTS.md
tests/fixtures/phase-f-tagmemo-semantic-association-v1.json
tests/phase-f-tagmemo-semantic-association-fixture.test.js
```

These artifacts are proposed for the next local-safe implementation slice. They are not created by this planning slice.

## Fixture Schema Draft

A future fixture should be synthetic and explicit-input only:

| Field | Meaning | Notes |
|---|---|---|
| `version` | Fixture contract version | Start with `phase-f-tagmemo-semantic-association-v1`. |
| `scenarioId` | Stable scenario id | Use deterministic ids such as `tagmemo-association-strength-basic`. |
| `memories` | Synthetic memory records | No real user memory, no diary/SQLite/vector reads. |
| `query` | Synthetic query object | Include text, tags, topic, and requested behavior. |
| `expectedAssociations` | Expected candidate groups | Express association class, not runtime score. |
| `blockedAssociations` | Over-expansion cases that must not match | Guard against broad semantic drift. |
| `orderingExpectation` | Stable relative ordering rule | Use deterministic tie-breaker categories. |
| `donorCompatibilityNote` | Donor-like behavior or intentional difference | Avoid claiming perfect donor equivalence. |
| `forbiddenClaims` | Claims the fixture must reject | Include runtime/readiness/public-MCP overclaims. |

## Scenario Matrix

| Scenario ID | Coverage | Expected Proof | Forbidden Behavior |
|---|---|---|---|
| `tagmemo-association-strength-basic` | Explicit tag relation ranks stronger than loose keyword overlap. | Tagged candidates grouped ahead of incidental text matches. | Treating any shared common word as a strong association. |
| `semantic-grouping-topic-cluster` | Topic co-membership groups related records. | Same-topic synthetic records form a candidate class. | Pulling unrelated topic records through broad synonyms. |
| `query-expansion-controlled` | Query expansion adds bounded semantic neighbors. | Only named neighbor class is accepted. | Expanding into all records with vague conceptual overlap. |
| `blocked-over-expansion-negative` | Negative control for semantic drift. | Non-neighbor records remain blocked. | Returning blocked records as relevant candidates. |
| `epa-residual-explicit-input` | EPA / ResidualPyramid influence is represented as explicit metadata only. | Metadata shapes are accepted without executing recall chain. | Reading real recall audit or claiming runtime EPA execution. |
| `ordering-tie-breaker-deterministic` | Equal association cases use stable tie-breakers. | Ordering expectation is deterministic and explainable. | Non-deterministic ordering or hidden provider score dependence. |
| `donor-difference-documented` | Intentional donor differences are explicit. | Difference is documented with local reason. | Claiming exact donor parity without evidence. |
| `readiness-overclaim-rejected` | Fixture rejects readiness/public-MCP/runtime claims. | Forbidden claims remain false/blocked. | Marking runtime readiness, `RC_READY`, or public MCP expansion as achieved. |

## Future Test Expectations

The future fixture test should verify only static fixture contract semantics:

- fixture has exact version
- required scenario ids exist exactly once
- every scenario has expected and blocked association groups
- no scenario references real diary, SQLite, vector index, candidate cache, recall audit, provider, HTTP endpoint, or user memory
- donor compatibility notes are explicit and non-overclaiming
- forbidden readiness/runtime/public-MCP claims are present and rejected
- future runtime implementation requirement is clearly separated from fixture evidence

## Suggested Next Task

```text
CM-0530 Phase F TagMemo semantic association fixture tests
```

Expected scope for `CM-0530`:

- add the synthetic JSON fixture
- add one fixture-structure test
- add a short docs record for the fixture tests
- run fixture JSON parse / targeted fixture test only
- no runtime/source behavior change

## Explicit Non-Goals

This plan does not:

- create fixture files or tests
- change TagMemo, recall, EPA, ResidualPyramid, rerank, ordering, or provider behavior
- run compare/rollback, strict gate, HTTP observe, provider smoke, or benchmark
- execute `search_memory` or recall path observation
- inspect real memory or audit stores
- mutate durable state
- expand public MCP tools
- push, tag, release, deploy, or cut over
- declare `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness

## Result

`CM-0529` completes as a docs-only fixture plan. The project remains:

```text
NOT_READY_BLOCKED
```
