# Phase F Three-Week Local-Safe Closeout And Next Candidates

Status: `LOCAL_SAFE_CLOSEOUT_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Scope: Phase F docs/fixtures/tests/board closeout for the active three-week local-safe goal

Date: 2026-05-21

## Purpose

Record the local-safe closeout for the current three-week Phase F goal and define the next three-week candidate lane.

This document is a planning and handoff surface only. It does not execute runtime work, call providers, read real memory stores, mutate durable state, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Three-Week Goal Requirements

| Requirement | Current evidence | Status |
|---|---|---|
| Week 1: reconcile docs/board state and add LightMemo directory semantics fixture | `docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_PLAN.md`; `docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_TESTS.md`; `docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_PACK_CLOSEOUT_REVIEW.md`; `tests/phase-f-lightmemo-directory-semantics-fixture.test.js`; `tests/fixtures/phase-f-lightmemo-directory-semantics-v1.json` | complete |
| Week 2: add EPA / ResidualPyramid chain metadata fixture and update fixture index | `docs/PHASE_F_EPA_RESIDUALPYRAMID_CHAIN_METADATA_FIXTURE_PLAN.md`; `docs/PHASE_F_EPA_RESIDUALPYRAMID_CHAIN_METADATA_FIXTURE_TESTS.md`; `tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js`; `tests/fixtures/phase-f-epa-residualpyramid-chain-metadata-v1.json`; `docs/PHASE_F_VCP_PARITY_FIXTURE_PACK_INTEGRATION_INDEX.md` | complete |
| Week 3: organize fixture pack, local-safe action matrix, and next three-week candidates | this document | complete |
| Preserve blocked readiness state | status and board keep `NOT_READY_BLOCKED` / `RC_NOT_READY_BLOCKED` | complete |
| Avoid prohibited action classes | no push/tag/release/deploy/cutover/provider/real memory scan/durable write/config mutation/public MCP expansion/readiness claim | complete |

## Fixture Pack Map

| Pack | Primary fixture | Primary test | Evidence class |
|---|---|---|---|
| TagMemo semantic association | `tests/fixtures/phase-f-tagmemo-semantic-association-v1.json` | `tests/phase-f-tagmemo-semantic-association-fixture.test.js` | synthetic fixture/test-only |
| Observability/admin review surface | `tests/fixtures/phase-f-observability-admin-review-surface-v1.json` | `tests/phase-f-observability-admin-review-surface-fixture.test.js` | synthetic fixture/test-only |
| Memory governance proposal | `tests/fixtures/phase-f-memory-governance-proposal-v1.json` | `tests/phase-f-memory-governance-proposal-fixture.test.js` | synthetic fixture/test-only |
| LightMemo directory semantics | `tests/fixtures/phase-f-lightmemo-directory-semantics-v1.json` | `tests/phase-f-lightmemo-directory-semantics-fixture.test.js` | synthetic fixture/test-only |
| EPA/ResidualPyramid chain metadata | `tests/fixtures/phase-f-epa-residualpyramid-chain-metadata-v1.json` | `tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js` | synthetic fixture/test-only |

Combined local fixture validation:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js tests\phase-f-lightmemo-directory-semantics-fixture.test.js tests\phase-f-epa-residualpyramid-chain-metadata-fixture.test.js
```

Latest local evidence for this closeout: combined Phase F fixture tests passed `28/28`.

## Local-Safe Action Matrix

| Action class | Default status | Notes |
|---|---|---|
| Docs and board updates inside `A:\codex-memory` | allowed | Keep changes narrow and preserve current truth labels. |
| Synthetic fixture JSON and structure-only tests | allowed | Must not import runtime recall, storage, HTTP, provider, or MCP mutation modules. |
| Targeted fixture tests | allowed | Use only local synthetic data. |
| Docs validation and `git diff --check` | allowed | Required before closeout. |
| Full `npm test` | optional local validation | Allowed when risk or changed tests justify it; not required for docs-only closeout. |
| Runtime source changes | not part of this closeout | Require a separate scoped task and validation plan. |
| HTTP observe or service start | blocked by default | Requires exact approval when A5/runtime-sensitive. |
| Provider calls | blocked | Do not run casually or for fixture-only work. |
| Real memory scan, import, export, migration, backup, restore, or durable write | blocked | Requires exact A5 approval and named target/action. |
| Public MCP tool/schema expansion | blocked | Public tools remain `record_memory`, `search_memory`, `memory_overview`. |
| Config/watchdog/startup changes | blocked | Includes Codex/Claude config and scheduled/startup persistence. |
| Push, tag, release, deploy, PR, or cutover | blocked | Needs explicit authorization or a fully passing project safe-push policy where applicable. |
| Readiness claim | blocked | Do not claim runtime readiness, final RC readiness, cutover readiness, production readiness, or `RC_READY`. |

## Next Three-Week Candidate Lane

### Week A: Memory Lifecycle Proposal States

Goal: extend synthetic governance coverage for proposal, supersession, tombstone, forget-flow, and lifecycle state transitions.

Allowed work:

- docs/fixture plan
- synthetic fixture/test contract
- closeout review
- board/status validation record

Blocked work:

- lifecycle runtime mutation
- SQLite migration
- durable memory/audit write
- real memory scan
- public MCP expansion

### Week B: Query-Quality Dry-Run Refresh

Goal: refresh fixture-only query-quality confidence without calling providers or reading real memory stores.

Allowed work:

- inspect existing fixture-only query suite shape
- add or refine synthetic query assertions
- update docs that describe fixture-only boundaries
- run targeted query fixture tests or `gate:ci` only if it remains fixture-only

Blocked work:

- provider benchmark/smoke
- true real-query execution against real memory stores
- broad recall observation
- runtime readiness claims

### Week C: Admin Review Schema Hardening

Goal: make local observability/admin fixture surfaces easier to review and harder to overclaim.

Allowed work:

- schema snapshot docs
- structure-only fixture tests
- local-safe report-shape review
- integration index update

Blocked work:

- live `governance:report` or `http-observe` evidence capture unless separately approved
- HTTP startup or config changes
- durable audit/memory writes
- production/admin readiness claims

## Stop Conditions

Stop before any task that requires:

- remote write
- destructive operation
- provider call
- real memory/runtime-store scan
- durable write
- public MCP expansion
- config/watchdog/startup mutation
- release/cutover/readiness transition

## Result

The active three-week Phase F local-safe goal is locally closed as docs/fixtures/tests/board evidence.

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
