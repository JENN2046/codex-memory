# Phase F VCP Parity Fixture Pack Integration Index

Status: `INTEGRATION_INDEX_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `748a0b3`

## Purpose

Index the completed local-safe Phase F fixture packs into one review map. This document links TagMemo parity hardening, observability/admin review surface, and memory-governance proposal fixtures without changing runtime behavior or claiming VCP parity completion.

## Integrated Fixture Packs

| Pack | Area | Evidence Class | Primary Test | Closeout |
|---|---|---|---|---|
| TagMemo semantic association | `P7-vcp-parity-hardening` | synthetic fixture/test-only | `tests/phase-f-tagmemo-semantic-association-fixture.test.js` | `docs/PHASE_F_TAGMEMO_FIXTURE_PACK_LOCAL_CLOSEOUT_REVIEW.md` |
| Observability/admin review surface | `P10-observability-admin` | synthetic fixture/test-only | `tests/phase-f-observability-admin-review-surface-fixture.test.js` | `docs/PHASE_F_GOVERNANCE_OBSERVABILITY_FIXTURE_PACK_CLOSEOUT_REVIEW.md` |
| Memory governance proposal | `P8-memory-governance` | synthetic fixture/test-only | `tests/phase-f-memory-governance-proposal-fixture.test.js` | `docs/PHASE_F_GOVERNANCE_OBSERVABILITY_FIXTURE_PACK_CLOSEOUT_REVIEW.md` |

## Artifact Map

### TagMemo semantic association

```text
docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_PLAN.md
docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_TESTS.md
docs/PHASE_F_TAGMEMO_CONTROLLED_QUERY_EXPANSION_NEGATIVE_FIXTURES.md
docs/PHASE_F_TAGMEMO_DETERMINISTIC_ORDERING_TIE_BREAKER_FIXTURES.md
docs/PHASE_F_TAGMEMO_FIXTURE_PACK_LOCAL_CLOSEOUT_REVIEW.md
tests/fixtures/phase-f-tagmemo-semantic-association-v1.json
tests/phase-f-tagmemo-semantic-association-fixture.test.js
```

### Observability/admin review surface

```text
docs/PHASE_F_OBSERVABILITY_ADMIN_REVIEW_SURFACE_DESIGN_DRAFT.md
docs/PHASE_F_OBSERVABILITY_ADMIN_REVIEW_SURFACE_FIXTURE_PLAN.md
docs/PHASE_F_OBSERVABILITY_ADMIN_REVIEW_SURFACE_FIXTURE_TESTS.md
tests/fixtures/phase-f-observability-admin-review-surface-v1.json
tests/phase-f-observability-admin-review-surface-fixture.test.js
```

### Memory governance proposal

```text
docs/PHASE_F_MEMORY_GOVERNANCE_PROPOSAL_DRAFT.md
docs/PHASE_F_MEMORY_GOVERNANCE_PROPOSAL_FIXTURE_PLAN.md
docs/PHASE_F_MEMORY_GOVERNANCE_PROPOSAL_FIXTURE_TESTS.md
tests/fixtures/phase-f-memory-governance-proposal-v1.json
tests/phase-f-memory-governance-proposal-fixture.test.js
```

## Combined Local Fixture Validation

The integration index expects these targeted fixture tests to pass together:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js
```

This command validates only synthetic fixture contracts. It does not run mainline gates, HTTP observe, governance report, provider calls, real memory scans, migrations, durable writes, or release/cutover actions.

## What This Index Proves

This index proves only that local Phase F fixture packs are discoverable, grouped, and validation-routable. It helps future agents find the relevant fixture contracts quickly.

It does not prove:

- runtime VCP parity
- production memory governance readiness
- real recall behavior
- real HTTP operation readiness
- provider/profile quality
- migration/import/export readiness
- public MCP expansion readiness
- RC readiness

## Public MCP Freeze

Public MCP tools remain frozen:

```text
record_memory
search_memory
memory_overview
```

No new public MCP tools or schema changes are introduced by these fixture packs.

## Remaining Hard Stops

Still blocked without exact approval:

- A5 recall observation
- provider calls
- real memory broad scans
- durable memory/audit writes
- migration/import/export/backup/restore apply
- public MCP expansion
- config/watchdog/startup changes
- push/tag/release/deploy
- RC cutover
- readiness claims

## Recommended Next Local-Safe Lane

```text
CM-0542 Phase F VCP parity fixture coverage gap review
```

Suggested scope:

- docs-only review of fixture coverage gaps across current Phase F packs
- identify whether next local-safe pack should target LightMemo directory semantics, EPA/ResidualPyramid chain metadata, or memory lifecycle proposal states
- no runtime/source changes unless separately planned
- no A5 action

## Result

The integrated fixture packs are locally indexed, but the project remains:

```text
NOT_READY_BLOCKED
```
