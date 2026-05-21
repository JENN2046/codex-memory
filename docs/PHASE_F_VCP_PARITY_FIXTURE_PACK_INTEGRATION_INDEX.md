# Phase F VCP Parity Fixture Pack Integration Index

Status: `INTEGRATION_INDEX_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Anchor commit: `748a0b3`

## Purpose

Index the completed local-safe Phase F fixture packs into one review map. This document links TagMemo parity hardening, observability/admin review surface, memory-governance proposal, LightMemo directory semantics, EPA/ResidualPyramid chain metadata, memory lifecycle proposal states, query-quality dry-run refresh, admin review schema hardening, public MCP freeze rollup, fixture drift changelog, and v3 receipt rollup fixtures without changing runtime behavior or claiming VCP parity completion.

## Integrated Fixture Packs

| Pack | Area | Evidence Class | Primary Test | Closeout |
|---|---|---|---|---|
| TagMemo semantic association | `P7-vcp-parity-hardening` | synthetic fixture/test-only | `tests/phase-f-tagmemo-semantic-association-fixture.test.js` | `docs/PHASE_F_TAGMEMO_FIXTURE_PACK_LOCAL_CLOSEOUT_REVIEW.md` |
| Observability/admin review surface | `P10-observability-admin` | synthetic fixture/test-only | `tests/phase-f-observability-admin-review-surface-fixture.test.js` | `docs/PHASE_F_GOVERNANCE_OBSERVABILITY_FIXTURE_PACK_CLOSEOUT_REVIEW.md` |
| Memory governance proposal | `P8-memory-governance` | synthetic fixture/test-only | `tests/phase-f-memory-governance-proposal-fixture.test.js` | `docs/PHASE_F_GOVERNANCE_OBSERVABILITY_FIXTURE_PACK_CLOSEOUT_REVIEW.md` |
| LightMemo directory semantics | `P7-vcp-parity-hardening` | synthetic fixture/test-only | `tests/phase-f-lightmemo-directory-semantics-fixture.test.js` | `docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_PACK_CLOSEOUT_REVIEW.md` |
| EPA/ResidualPyramid chain metadata | `P7-vcp-parity-hardening` | synthetic fixture/test-only | `tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js` | `docs/PHASE_F_EPA_RESIDUALPYRAMID_CHAIN_METADATA_FIXTURE_TESTS.md` |
| Memory lifecycle proposal states | `P8-memory-governance` | synthetic fixture/test-only | `tests/phase-f-memory-lifecycle-proposal-states-fixture.test.js` | `docs/PHASE_F_MEMORY_LIFECYCLE_PROPOSAL_STATES_FIXTURE_TESTS.md` |
| Query-quality dry-run refresh | `P7-vcp-parity-hardening` | synthetic fixture/test-only | `tests/phase-f-query-quality-dry-run-refresh-fixture.test.js` | `docs/PHASE_F_QUERY_QUALITY_DRY_RUN_REFRESH_FIXTURE_TESTS.md` |
| Admin review schema hardening | `P10-observability-admin` | synthetic fixture/test-only | `tests/phase-f-admin-review-schema-hardening-fixture.test.js` | `docs/PHASE_F_ADMIN_REVIEW_SCHEMA_HARDENING_FIXTURE_TESTS.md` |
| Public MCP freeze rollup | `P7-vcp-parity-hardening / P10-observability-admin` | synthetic fixture/test-only | `tests/phase-f-public-mcp-freeze-rollup-fixture.test.js` | `docs/PHASE_F_PUBLIC_MCP_FREEZE_ROLLUP.md` |
| Fixture drift changelog | `P6-docs-drift` | synthetic fixture/test-only | `tests/phase-f-fixture-drift-changelog-fixture.test.js` | `docs/PHASE_F_FIXTURE_DRIFT_CHANGELOG.md` |
| V3 receipt rollup | `P6-docs-drift / P10-observability-admin` | synthetic fixture/test-only | `tests/smart-standing-authorization-v3-receipt-rollup-fixture.test.js` | `docs/SMART_STANDING_AUTHORIZATION_V3_RECEIPT_ROLLUP.md` |

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

### LightMemo directory semantics

```text
docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_PLAN.md
docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_TESTS.md
docs/PHASE_F_LIGHTMEMO_DIRECTORY_SEMANTICS_FIXTURE_PACK_CLOSEOUT_REVIEW.md
tests/fixtures/phase-f-lightmemo-directory-semantics-v1.json
tests/phase-f-lightmemo-directory-semantics-fixture.test.js
```

### EPA/ResidualPyramid chain metadata

```text
docs/PHASE_F_EPA_RESIDUALPYRAMID_CHAIN_METADATA_FIXTURE_PLAN.md
docs/PHASE_F_EPA_RESIDUALPYRAMID_CHAIN_METADATA_FIXTURE_TESTS.md
tests/fixtures/phase-f-epa-residualpyramid-chain-metadata-v1.json
tests/phase-f-epa-residualpyramid-chain-metadata-fixture.test.js
```

### Memory lifecycle proposal states

```text
docs/PHASE_F_MEMORY_LIFECYCLE_PROPOSAL_STATES_FIXTURE_TESTS.md
tests/fixtures/phase-f-memory-lifecycle-proposal-states-v1.json
tests/phase-f-memory-lifecycle-proposal-states-fixture.test.js
```

### Query-quality dry-run refresh

```text
docs/PHASE_F_QUERY_QUALITY_DRY_RUN_REFRESH_FIXTURE_TESTS.md
tests/fixtures/phase-f-query-quality-dry-run-refresh-v1.json
tests/phase-f-query-quality-dry-run-refresh-fixture.test.js
```

### Admin review schema hardening

```text
docs/PHASE_F_ADMIN_REVIEW_SCHEMA_HARDENING_FIXTURE_TESTS.md
tests/fixtures/phase-f-admin-review-schema-hardening-v1.json
tests/phase-f-admin-review-schema-hardening-fixture.test.js
```

### Public MCP freeze rollup

```text
docs/PHASE_F_PUBLIC_MCP_FREEZE_ROLLUP.md
tests/fixtures/phase-f-public-mcp-freeze-rollup-v1.json
tests/phase-f-public-mcp-freeze-rollup-fixture.test.js
```

### Fixture drift changelog

```text
docs/PHASE_F_FIXTURE_DRIFT_CHANGELOG.md
tests/fixtures/phase-f-fixture-drift-changelog-v1.json
tests/phase-f-fixture-drift-changelog-fixture.test.js
```

### V3 receipt rollup

```text
docs/SMART_STANDING_AUTHORIZATION_V3_RECEIPT_ROLLUP.md
tests/fixtures/smart-standing-authorization-v3-receipt-rollup-v1.json
tests/smart-standing-authorization-v3-receipt-rollup-fixture.test.js
```

## Combined Local Fixture Validation

The integration index expects these targeted fixture tests to pass together:

```powershell
node --test tests\phase-f-tagmemo-semantic-association-fixture.test.js tests\phase-f-observability-admin-review-surface-fixture.test.js tests\phase-f-memory-governance-proposal-fixture.test.js tests\phase-f-lightmemo-directory-semantics-fixture.test.js tests\phase-f-epa-residualpyramid-chain-metadata-fixture.test.js tests\phase-f-memory-lifecycle-proposal-states-fixture.test.js tests\phase-f-query-quality-dry-run-refresh-fixture.test.js tests\phase-f-admin-review-schema-hardening-fixture.test.js tests\phase-f-readiness-boundary-wording-guard-fixture.test.js tests\phase-f-cross-pack-dependency-map-fixture.test.js tests\phase-f-public-mcp-freeze-rollup-fixture.test.js tests\phase-f-fixture-drift-changelog-fixture.test.js tests\smart-standing-authorization-v3-receipt-rollup-fixture.test.js
```

This command validates only synthetic fixture contracts. It does not run mainline gates, HTTP observe, governance report, provider calls, real memory scans, migrations, durable writes, or release/cutover actions.

## Companion Review Surfaces

```text
docs/PHASE_F_VCP_PARITY_FIXTURE_COVERAGE_GAP_REVIEW.md
docs/PHASE_F_FIXTURE_PACK_VALIDATION_SURFACE.md
docs/PHASE_F_CROSS_PACK_DEPENDENCY_MAP.md
tests/fixtures/phase-f-readiness-boundary-wording-guard-v1.json
tests/phase-f-readiness-boundary-wording-guard-fixture.test.js
tests/fixtures/phase-f-cross-pack-dependency-map-v1.json
tests/phase-f-cross-pack-dependency-map-fixture.test.js
docs/PHASE_F_PUBLIC_MCP_FREEZE_ROLLUP.md
tests/fixtures/phase-f-public-mcp-freeze-rollup-v1.json
tests/phase-f-public-mcp-freeze-rollup-fixture.test.js
docs/PHASE_F_FIXTURE_DRIFT_CHANGELOG.md
tests/fixtures/phase-f-fixture-drift-changelog-v1.json
tests/phase-f-fixture-drift-changelog-fixture.test.js
docs/SMART_STANDING_AUTHORIZATION_V3_RECEIPT_ROLLUP.md
tests/fixtures/smart-standing-authorization-v3-receipt-rollup-v1.json
tests/smart-standing-authorization-v3-receipt-rollup-fixture.test.js
```

The wording guard command is:

```powershell
node --test tests\phase-f-readiness-boundary-wording-guard-fixture.test.js
```

It scans watched Phase F Markdown docs for readiness-sensitive terms and requires each hit to appear in denial, non-claim, hard-stop, or blocked context.

The cross-pack dependency map command is:

```powershell
node --test tests\phase-f-cross-pack-dependency-map-fixture.test.js
```

It validates a synthetic graph of pack relationships and non-claims. It does not prove runtime dependency, implementation order, or readiness.

The public MCP freeze rollup command is:

```powershell
node --test tests\phase-f-public-mcp-freeze-rollup-fixture.test.js
```

It validates only a structure-only local fixture for the frozen public MCP tool names and the v3 Green Lane no-Amber trial receipt. It does not inspect live MCP schema, start runtime, or prove public MCP readiness.

The fixture drift changelog command is:

```powershell
node --test tests\phase-f-fixture-drift-changelog-fixture.test.js
```

It validates only a docs/fixture/test changelog keyed by CM id, validation id, pack id, validation count, and explicit non-claims. It does not create release notes, tag, push, start runtime, or claim readiness.

The v3 receipt rollup command is:

```powershell
node --test tests\smart-standing-authorization-v3-receipt-rollup-fixture.test.js
```

It validates only a synthetic receipt rollup for Green Lane local tasks, aggregate zero external/write budgets, and Red gate preservation. It does not execute Amber actions, implement a CLI receipt rollup, call providers, read or write real memory, or claim readiness.

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
CM-0678+ scoped read-only CLI/parser implementation or next Phase F synthetic guard
```

Suggested scope:

- separate scoped read-only CLI/parser implementation, or next Phase F synthetic guard
- no provider call, real memory scan, durable write, config change, public MCP expansion, or readiness claim
- no push/tag/release/deploy unless explicitly authorized
- no A5 action

Current closeout and next-candidate surface:

```text
docs/PHASE_F_THREE_WEEK_LOCAL_SAFE_CLOSEOUT_AND_NEXT_CANDIDATES.md
```

## Result

The integrated fixture packs are locally indexed, but the project remains:

```text
NOT_READY_BLOCKED
```
