# Phase F Query-Quality Dry-Run Refresh Fixture Tests

Status: `FIXTURE_TESTS_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Scope: Phase F synthetic fixture/test-only query-quality dry-run refresh

## Purpose

This slice refreshes query-quality coverage as local synthetic assertions only.

It adds query assertion shape coverage for lifecycle proposal states, forget-flow boundaries, and admin review schema surfaces without calling providers, reading real memory stores, running real query execution, mutating durable state, expanding public MCP tools, changing config, pushing, cutting over, or claiming readiness.

## Added Artifacts

```text
tests/fixtures/phase-f-query-quality-dry-run-refresh-v1.json
tests/phase-f-query-quality-dry-run-refresh-fixture.test.js
```

## Covered Semantics

- Fixture-only query assertions have deterministic ids, areas, queries, targets, positive phrases, and negative phrases.
- Dry-run report shape keeps local counters such as `caseCount`, `fixtureOnlyCount`, `assertedCount`, `passedCount`, `failedCount`, `mutated`, `providerCalls`, and `durableMemoryTouched`.
- Fake scoring and real-memory/provider fields remain forbidden.
- Readiness and runtime authority overclaims remain blocked.

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-query-quality-dry-run-refresh-fixture.test.js
```

Combined Phase F fixture validation should include this test alongside the existing fixture packs.

## Boundary

This is fixture/test-only evidence. It does not prove real query quality, runtime recall quality, provider/profile quality, production readiness, final RC readiness, cutover readiness, or `RC_READY`.

Public MCP tools remain frozen:

```text
record_memory
search_memory
memory_overview
```

## Result

The query-quality dry-run refresh contract is locally represented, but the project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
