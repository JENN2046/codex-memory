# P17.1 V8 Diagnostic Surface Inventory

Phase: `P17.1-v8-diagnostic-surface-inventory`

Status: completed locally

## Purpose

P17.1 inventories the existing advanced memory intelligence / V8 diagnostic surfaces before adding any fixture tests or runtime changes.

This is an inventory-only phase. It does not run provider benchmarks, tune runtime ranking, change MCP contracts, read real memory, or implement new V8 behavior.

## Source Surfaces

| Surface | Current role | Existing evidence | Gap |
|---|---|---|---|
| `src/cli/v8-diagnose.js` | Read-only diagnostic report for query terrain, residual pyramid, TagMemo analysis, meta-thinking, geodesic intent, and embedding profile metadata | CLI test in `tests/rebuild-profile-cli.test.js`; README command reference | No dedicated P17 fixture snapshot for full JSON shape or forbidden output fields |
| `src/recall/TagMemoEngine.js` | Query analysis, explicit `::TagMemo` weight parsing, dynamic tag/core weight, record scoring, EPA / ResidualPyramid metrics, meta-thinking | P16.2 shape fixture; P16.3 targeted semantic fixture; phase-b terrain test | No V8-specific canonical query matrix across diagnostic categories |
| `src/recall/EPAModule.js` | Terrain basis, dominant axes, energy signature, logic depth, resonance, semantic width, entropy | `tests/phase-b-sync-cache-rerank.test.js`; P16 telemetry shape | No standalone EPA fixture for axis distribution and ranges |
| `src/recall/ResidualPyramid.js` | Residual levels and coverage / novelty / breadth / TagMemo activation features | `v8-diagnose` CLI test; P16 fixture-shape telemetry | No dedicated residual-level snapshot by query family |
| `src/recall/RerankService.js` | Local rerank, RRF, geodesic rerank score blending, terrain and continuity components | phase-b rerank/geodesic tests; P16 targeted TagMemo+Rerank fixture | No P17 diagnostic fixture tying geodesic intent to report safety |
| `src/recall/CandidateGenerator.js` | Carries terrain activation / tension into candidates when query analysis is present | phase-b recall tests | No diagnostic-only candidate signal fixture |

## Existing Test Coverage

| Test | Coverage | P17 interpretation |
|---|---|---|
| `tests/rebuild-profile-cli.test.js` | `v8-diagnose` exposes terrain and meta-thinking diagnostics | Good smoke, not enough for full report schema lock |
| `tests/phase-b-sync-cache-rerank.test.js` | EPA terrain analysis, meta-thinking reasons, geodesic rerank signals, profile-controlled tag/core/geodesic ranges | Good runtime-adjacent coverage, not a P17 diagnostic matrix |
| `tests/tagmemo-semantic-fixture-shape.test.js` | TagMemo directive parsing, scoring contribution shape, telemetry keys | P16 evidence; useful prerequisite for V8 fixtures |
| `tests/tagmemo-targeted-semantic-fixture.test.js` | Targeted TagMemo+Rerank ordering and recall audit telemetry | P16 evidence; useful sanity check before V8 diagnostics |
| `tests/rebuild-profile-cli.test.js` profile suite checks | profile migration suite includes `v8-terrain` and `tagmemo-geodesic` query ids | Good fixture source candidates, not a live provider benchmark |

## Diagnostic Output Fields To Lock Later

Future P17.2/P17.3 fixture tests should lock at least:

- `mode`
- `destructive`
- `embeddingProfile`
- `query`
- `terrain`
- `residualPyramid`
- `tagMemo`
- `metaThinking`
- `geodesic`

Forbidden output fields:

- raw secrets
- raw workspace id in low-risk summaries
- provider keys
- authorization headers
- live provider latency claims when no provider call happened
- fake `hitRate` / `qualityScore`

## Candidate Fixture Query Families

P17.2 should prefer synthetic, deterministic query families:

- technical migration / checkpoint query
- governance / policy / lifecycle query
- recall-quality / ranking evidence query
- broad semantic association query
- geodesic rerank intent query
- malformed or missing query error shape

## Boundary Confirmation

P17.1 does not:

- modify `src/`
- add tests or fixtures
- run `v8-diagnose`
- call providers
- run provider smoke / benchmark
- read or mutate real memory
- tune runtime ranking
- change MCP tools or schema
- run SQLite migration
- apply import/export
- change dependencies or lockfiles
- tag, release, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Next Phase

Next recommended phase: `P17.2-v8-diagnostic-fixture-shape-tests`.

That phase may add synthetic fixtures and tests for `v8-diagnose` report shape, but should still avoid runtime tuning, provider calls, real memory preview, MCP expansion, migration, and V8 implementation.
