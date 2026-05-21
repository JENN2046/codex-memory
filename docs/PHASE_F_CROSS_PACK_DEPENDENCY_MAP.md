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
| Admin review schema hardening | observability/admin, governance, lifecycle | validation surface, wording guard | admin production readiness |
| Fixture pack validation surface | all eight fixture packs | wording guard | runtime validation |
| Readiness boundary wording guard | observability/admin, admin schema, validation surface | future Phase F docs | runtime readiness |

## Next Synthetic Contract Candidates

| Candidate | Depends On | Safe Shape | Blocked Actions |
|---|---|---|---|
| Public MCP freeze rollup | validation surface, wording guard | structure-only fixture asserting protected public tool names across pack fixtures and docs | live MCP schema inspection, public MCP expansion, runtime service start |
| Fixture drift changelog | validation surface, dependency map | docs-only changelog keyed by CM id, pack id, and validation count | release note claim, tag, push |
| Cross-pack dependency map | validation surface | synthetic graph of local fixture pack relationships and non-claims | runtime dependency claim, readiness claim, provider call |

## Validation

Targeted validation:

```powershell
node --test tests\phase-f-cross-pack-dependency-map-fixture.test.js
```

Combined local fixture validation should include the eight Phase F fixture packs, the readiness wording guard, and this dependency map test.

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
