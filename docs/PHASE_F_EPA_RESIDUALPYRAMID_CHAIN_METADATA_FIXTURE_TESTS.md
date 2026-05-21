# Phase F EPA/ResidualPyramid Chain Metadata Fixture Tests

Status: `FIXTURE_TESTS_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Scope: Phase F synthetic fixture/test-only EPA and ResidualPyramid chain metadata contract

## Purpose

This slice adds a synthetic fixture and structure-only test for EPA and ResidualPyramid recall-chain metadata semantics.

It turns the CM-0546 plan into a local fixture contract without executing real recall, importing EPA or ResidualPyramid runtime modules, reading real memory stores, calling providers, mutating durable state, expanding public MCP tools, or claiming readiness.

## Added Artifacts

```text
tests/fixtures/phase-f-epa-residualpyramid-chain-metadata-v1.json
tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js
```

## Covered Scenarios

- EPA bounded expansion metadata.
- EPA deterministic pruning metadata.
- ResidualPyramid layer and ordering metadata.
- EPA-to-ResidualPyramid chain handoff linkage.
- Missing chain metadata fail-closed behavior.
- Fixture-only readiness overclaim rejection.

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-epa-residualpyramid-chain-metadata-fixture.test.js
```

Combined Phase F fixture validation should include:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js tests\phase-f-lightmemo-directory-semantics-fixture.test.js tests\phase-f-epa-residualpyramid-chain-metadata-fixture.test.js
```

## Boundary

This is fixture/test-only evidence. It does not prove runtime VCP parity, real EPA recall behavior, real ResidualPyramid recall behavior, provider/profile quality, production readiness, final RC readiness, cutover readiness, or `RC_READY`.

Public MCP tools remain frozen:

```text
record_memory
search_memory
memory_overview
```

## Next Safe Task

After validation, update the Phase F fixture pack integration index so EPA/ResidualPyramid joins TagMemo, observability/admin, memory-governance, and LightMemo as a routed local fixture pack.

## Result

The EPA/ResidualPyramid chain metadata fixture contract is locally represented, but the project remains:

```text
NOT_READY_BLOCKED
```
