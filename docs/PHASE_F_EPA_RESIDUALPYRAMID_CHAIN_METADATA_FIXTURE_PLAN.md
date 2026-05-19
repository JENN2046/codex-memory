# Phase F EPA/ResidualPyramid Chain Metadata Fixture Plan

Status: PLANNED_LOCAL_FIXTURE_ONLY
Decision: NOT_READY_BLOCKED
Task: CM-0546
Anchor commit: 83a8fd7 docs: close phase f lightmemo fixtures
Scope: Phase F fixture/test-only planning for EPA and ResidualPyramid chain metadata semantics

## Summary

This plan defines a local-safe synthetic fixture lane for EPA and ResidualPyramid recall-chain metadata parity hardening.

The purpose is to capture expected chain metadata shapes before any runtime implementation or real recall observation is attempted. The planned fixture must remain structure-only and deterministic. It must not call provider services, scan real memory stores, execute recall paths, mutate durable state, or expand public MCP tools.

The project state remains `NOT_READY_BLOCKED`.

## Why This Fixture Pack Exists

EPA and ResidualPyramid behavior is recall-chain sensitive. A useful parity fixture should describe the evidence envelope and blocked boundaries before runtime work begins.

The fixture pack should make these questions explicit:

- Which chain stage produced or transformed a candidate?
- Which metadata fields are required to explain stage ordering?
- Which association, pruning, expansion, and rerank boundaries are allowed?
- Which metadata omissions must fail closed?
- Which readiness or runtime-parity claims are forbidden from fixture-only evidence?

## Planned Fixture Coverage

The future synthetic fixture should include scenarios for:

1. EPA expansion metadata
   - source candidate id
   - expansion reason
   - bounded expansion scope
   - blocked broad expansion reason

2. EPA pruning metadata
   - pruned candidate id
   - pruning reason
   - deterministic stage id
   - no hidden provider or real-store dependency

3. ResidualPyramid layer metadata
   - layer id
   - parent candidate id
   - residual signal class
   - ordering/tie-break signal

4. Chain handoff metadata
   - prior stage id
   - next stage id
   - candidate count before and after handoff
   - fail-closed behavior for missing stage linkage

5. Negative readiness cases
   - fixture-only evidence must not claim runtime parity
   - fixture-only evidence must not claim real recall validation
   - fixture-only evidence must not claim RC readiness

## Proposed Artifact Set

Future implementation should add:

- `tests/fixtures/phase-f-epa-residualpyramid-chain-metadata-v1.json`
- `tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js`
- `docs/PHASE_F_EPA_RESIDUALPYRAMID_CHAIN_METADATA_FIXTURE_TESTS.md`

This planning step adds only the plan document and board/status records.

## Fixture Contract Draft

The fixture JSON should include:

```json
{
  "fixtureId": "phase-f-epa-residualpyramid-chain-metadata-v1",
  "status": "synthetic_fixture_only",
  "runtimeParityClaimed": false,
  "realRecallObserved": false,
  "providerCalled": false,
  "durableStateMutated": false,
  "publicMcpExpanded": false,
  "scenarios": []
}
```

Each scenario should include:

- `id`
- `chainFamily`
- `stage`
- `inputMetadata`
- `expectedMetadata`
- `blockedClaims`
- `failureMode`

## Validation Plan

Planning validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future fixture validation:

```powershell
node --test tests\phase-f-epa-residualpyramid-chain-metadata-fixture.test.js
```

Future combined Phase F fixture validation should include the TagMemo, observability, governance, LightMemo, and EPA/ResidualPyramid fixture tests.

## Hard Boundaries

This task does not authorize:

- runtime recall-chain implementation
- real EPA or ResidualPyramid recall observation
- real memory broad scan
- provider calls
- HTTP observe
- durable memory or audit writes
- public MCP expansion
- migration/import/export/backup/restore apply
- config/watchdog/startup changes
- push, tag, release, deploy, or RC cutover
- `RC_READY`, runtime readiness, or final readiness claim

## Next Safe Task

Recommended next local-safe task:

- `CM-0547 Phase F EPA/ResidualPyramid chain metadata synthetic fixture contract`

That task should remain fixture/test-only unless separately authorized.
