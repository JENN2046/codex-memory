# Phase F VCP Parity Fixture Coverage Gap Review

Status: `COVERAGE_GAP_REVIEW_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Scope: docs-only review of the current eight Phase F synthetic fixture packs

Date: 2026-05-21

## Purpose

Review the completed Phase F local-safe fixture packs and identify the next synthetic contracts worth adding.

This review is docs-only. It does not change runtime behavior, source code, public MCP tools, durable memory, audit logs, provider configuration, real memory stores, remote state, or project readiness state.

## Current Eight-Pack Coverage

| Pack | Current Evidence | Strongest Covered Boundary | Remaining Gap |
|---|---|---|---|
| TagMemo semantic association | `tests/phase-f-tagmemo-semantic-association-fixture.test.js` | association grouping, controlled expansion negatives, deterministic ordering, readiness overclaim rejection | no fixture-pack-level drift summary across future TagMemo variants |
| Observability/admin review surface | `tests/phase-f-observability-admin-review-surface-fixture.test.js` | review surface shape, public MCP freeze, hard-stop visibility, local-safe next action | schema consistency can still drift across newer admin surfaces |
| Memory governance proposal | `tests/phase-f-memory-governance-proposal-fixture.test.js` | proposal objects, approval requirements, no default durable mutation, authority/readiness overclaim rejection | lifecycle transition edge cases needed a separate matrix and are now covered by the lifecycle pack |
| LightMemo directory semantics | `tests/phase-f-lightmemo-directory-semantics-fixture.test.js` | `maid`, `folder`, alias, excluded-folder, all-KB explicit-only behavior | no runtime LightMemo recall proof; this remains intentionally blocked |
| EPA/ResidualPyramid chain metadata | `tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js` | bounded EPA metadata, pruning metadata, ResidualPyramid layer metadata, chain handoff, fail-closed missing metadata | no real recall-chain observation; this remains intentionally blocked |
| Memory lifecycle proposal states | `tests/phase-f-memory-lifecycle-proposal-states-fixture.test.js` | proposal, supersession, tombstone, forget-flow transitions and blocked direct apply | no durable lifecycle implementation proof; this remains intentionally blocked |
| Query-quality dry-run refresh | `tests/phase-f-query-quality-dry-run-refresh-fixture.test.js` | fixture-only query assertions, dry-run report shape, fake-score rejection | no real query quality proof or provider quality proof; this remains intentionally blocked |
| Admin review schema hardening | `tests/phase-f-admin-review-schema-hardening-fixture.test.js` | schema snapshot, local-safe action matrix, fixture pack status, hard stops | needs stable validation surface and wording guard to resist docs drift |

## Next Synthetic Contract Candidates

| Candidate | Why It Matters | Safe Fixture-Only Shape | Stop Boundary |
|---|---|---|---|
| Fixture pack validation surface cleanup | The `45/45` validation command is long and easy to copy incorrectly. | docs index that lists pack map, stable command, validation evidence class, and expected result labels | do not add runtime command wrappers or package scripts without separate scope |
| Readiness / boundary wording guard | Phase F docs intentionally mention readiness words only as blocked/denial examples. | fixture listing watched docs, sensitive terms, and allowed denial markers; structure-only test scans Markdown text | do not treat wording scan as runtime readiness proof |
| Cross-pack dependency map | Some packs depend conceptually on earlier packs, but no local map shows ordering. | synthetic map from pack id to upstream/downstream docs/tests and non-claims | do not imply implementation dependency or runtime contract |
| Public MCP freeze rollup | Every pack repeats the protected three tools, but no single rollup guards all pack fixtures together. | structure-only fixture asserting each pack still lists `record_memory`, `search_memory`, `memory_overview` when applicable | do not inspect or mutate live MCP schema |
| Fixture drift changelog | The pack set is growing; future agents need a compact local history of when packs were added. | docs-only changelog keyed by CM id, pack id, and validation count | do not claim release notes or shipped capability |

## Recommended Next Three

The next local-safe batch should be:

1. `Phase F Fixture Pack Validation Surface Cleanup`
2. `Phase F Readiness Boundary Wording Guard`
3. `Phase F Cross-Pack Dependency Map`

The first two are selected now because the user asked for validation-surface cleanup and readiness/boundary wording guard. The cross-pack dependency map remains the next best candidate after this batch.

## Explicit Non-Claims

This review does not prove:

- runtime VCP parity
- real LightMemo recall behavior
- real EPA/ResidualPyramid recall quality
- durable memory lifecycle implementation
- real query quality
- provider/profile quality
- live admin surface readiness
- active-memory rollback readiness beyond separately approved evidence
- public MCP schema execution
- production readiness
- RC readiness

## Required Validation For This Slice

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

When fixture/test changes are made in the same batch, run the Phase F combined fixture command from `docs/PHASE_F_FIXTURE_PACK_VALIDATION_SURFACE.md`.

## Result

The current Phase F fixture packs are useful and locally validated, but they remain synthetic fixture/test-only evidence. The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
