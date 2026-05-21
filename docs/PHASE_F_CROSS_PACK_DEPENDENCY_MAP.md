# Phase F Cross-Pack Dependency Map

Status: `DEPENDENCY_MAP_COMPLETE`

Decision: `NOT_READY_BLOCKED`

Scope: synthetic docs/fixture/test-only map of Phase F fixture pack relationships

Date: 2026-05-21

## Purpose

Map upstream and downstream relationships between the current Phase F fixture packs and companion review surfaces.

This map is a local review aid only. It does not prove runtime dependencies, runtime VCP parity, real recall behavior, real query quality, provider/profile quality, public MCP expansion readiness, production readiness, cutover readiness, or RC readiness.

## Added Artifacts

```text
tests/fixtures/phase-f-cross-pack-dependency-map-v1.json
tests/phase-f-cross-pack-dependency-map-fixture.test.js
tests/fixtures/phase-f-public-mcp-freeze-rollup-v1.json
tests/phase-f-public-mcp-freeze-rollup-fixture.test.js
docs/PHASE_F_PUBLIC_MCP_FREEZE_ROLLUP.md
tests/fixtures/phase-f-fixture-drift-changelog-v1.json
tests/phase-f-fixture-drift-changelog-fixture.test.js
docs/PHASE_F_FIXTURE_DRIFT_CHANGELOG.md
tests/fixtures/smart-standing-authorization-v3-receipt-rollup-v1.json
tests/smart-standing-authorization-v3-receipt-rollup-fixture.test.js
docs/SMART_STANDING_AUTHORIZATION_V3_RECEIPT_ROLLUP.md
```

## Pack Relationship Summary

| Pack | Upstream | Downstream | Main Non-Claim |
|---|---|---|---|
| TagMemo semantic association | none | EPA/ResidualPyramid, query-quality refresh | real recall behavior |
| Observability/admin review surface | none | admin schema hardening, wording guard | live admin readiness |
| Memory governance proposal | none | lifecycle proposal states, admin schema hardening | durable governance mutation |
| LightMemo directory semantics | TagMemo | query-quality refresh | real LightMemo recall |
| EPA/ResidualPyramid chain metadata | TagMemo | query-quality refresh | real recall-chain observation |
| Memory lifecycle proposal states | memory governance proposal | admin schema hardening, query-quality refresh | durable lifecycle implementation |
| Query-quality dry-run refresh | TagMemo, LightMemo, EPA/ResidualPyramid, lifecycle | validation surface | real query quality |
| Admin review schema hardening | observability/admin, governance, lifecycle | validation surface, wording guard | not admin production readiness |
| Fixture pack validation surface | all eight fixture packs | wording guard | runtime validation |
| Readiness boundary wording guard | observability/admin, admin schema, validation surface | public MCP freeze rollup, future Phase F docs | runtime readiness |
| Public MCP freeze rollup | validation surface, wording guard | fixture drift changelog, future Phase F docs | runtime public MCP schema proof |
| Fixture drift changelog | validation surface, public MCP freeze rollup | v3 receipt rollup, future Phase F docs | release note claim |
| V3 receipt rollup | public MCP freeze rollup, fixture drift changelog | future Phase F docs | runtime receipt recorder implementation |

## Next Synthetic Contract Candidates

| Candidate | Depends On | Safe Shape | Blocked Actions |
|---|---|---|---|
| Next synthetic guard | v3 receipt rollup | docs/fixture-only guard selected by the next local-safe objective | readiness claim, provider call, public MCP expansion |

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-cross-pack-dependency-map-fixture.test.js
```

Combined local fixture validation should include the eight Phase F fixture packs, the readiness wording guard, this dependency map test, the public MCP freeze rollup test, the fixture drift changelog test, and the v3 receipt rollup test.

## Boundary

This is docs/fixture/test-only evidence. It does not run mainline gates, HTTP observe, governance report, provider calls, real memory scans, migrations, durable writes, package scripts, release/cutover actions, or readiness transitions.

Public MCP tools remain frozen:

```text
record_memory
search_memory
memory_overview
```

## Result

The Phase F cross-pack dependency map is locally represented, but the project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
