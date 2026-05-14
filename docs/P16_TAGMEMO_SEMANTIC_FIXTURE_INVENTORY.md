# P16.1 TagMemo Semantic Fixture Inventory

更新时间：2026-05-14

## Phase

`P16.1-TagMemo-semantic-fixture-inventory`

## Purpose

Inventory current TagMemo / semantic association coverage before adding P16 fixtures or tuning recall behavior.

This phase is inventory-only. It does not add fixtures, change tests, tune ranking, run provider benchmarks, expose new MCP tools, or implement V8 behavior.

## Current Baseline

- Phase start baseline: `3b7aee6` on local `main` and `origin/main`.
- P16 planning entry: [P16_TAGMEMO_SEMANTIC_ASSOCIATION_PARITY_PLAN.md](/A:/codex-memory/docs/P16_TAGMEMO_SEMANTIC_ASSOCIATION_PARITY_PLAN.md).
- P14 donor parity standing gate baseline: compare `43/43 matched`, rollback `43/43 rollback-ready`.
- P15 query-quality standing gate baseline: fixture recall dry-run `14/14`, `mutated=false`, `providerCalls=0`, `durableMemoryTouched=false`.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- `validate_memory` remains internal-only.

## Source Surface Inventory

| Surface | Role | Current evidence | Gap |
|---|---|---|---|
| `src/recall/TagMemoEngine.js` | Query analysis, explicit `::TagMemo` weight parsing, dynamic tag/core weights, record scoring, meta-thinking score | Covered indirectly by passive recall and v8 terrain tests | No dedicated fixture snapshot for query analysis, dynamic weights, matched core tags, or score components |
| `src/recall/EPAModule.js` | EPA axes, terrain basis, energy signature, logic depth, resonance, semantic width | Covered by v8 terrain analysis test | No parity fixture for axis distribution or terrain shape across canonical query families |
| `src/recall/ResidualPyramid.js` | Residual levels, coverage, novelty, breadth, TagMemo activation | Covered by v8-diagnose CLI test and terrain test | No fixture locking residual levels for TagMemo-specific queries |
| `src/recall/SemanticGroupManager.js` | `::Group(tag/day/target)` strategy and interleaving | Covered by `::Group(tag)` passive recall test | No dedicated fixture for grouping interaction with TagMemo + rerank + time |
| `src/recall/CandidateGenerator.js` | Vector/lexical/TagMemo/structural/context/diary score composition | Covered indirectly by recall tests and diary vector candidate test | No fixture that snapshots score contribution boundaries without changing runtime |
| `src/recall/RerankService.js` | local/rrf/geodesic rerank and geodesic rank signal | Covered by terrain/geodesic test and recall audit test | No fixture matrix for `::TagMemo` vs `::TagMemo+` vs `::Rerank+N` |
| `src/recall/RecallAuditService.js` | recall audit fields for semantic candidate count, axes, rerank, tags, meta-thinking | Covered by recall audit test | No schema fixture dedicated to TagMemo telemetry fields |
| `src/adapters/vcp-passive-memory/CompatibilitySyntaxAdapter.js` | Passive `[[...]]`, `::TagMemo`, `::Rerank`, `::Time`, active block parsing | Covered by Phase A syntax test | No fixture table for malformed / boundary `::TagMemo` directive forms |
| `src/adapters/vcp-light-memory/index.js` | `tag_boost`, `core_tags`, rerank aliases, LightMemo compatibility query | Covered by LightMemo boundary tests | No P16-specific fixture tying donor LightMemo options to TagMemo score telemetry |
| `src/cli/v8-diagnose.js` | Read-only terrain / residual / TagMemo / meta-thinking report | Covered by CLI test | P17/V8 evidence surface only; not a P16 implementation authorization |

## Existing Test Inventory

| Test file | Existing coverage | P16 relevance | Gap |
|---|---|---|---|
| `tests/phase-a-services.test.js` | Parses `::Rerank+0.7`, `::TagMemo+1.2`, active blocks, geodesic flag | Syntax baseline | No malformed directive or clamp boundary matrix |
| `tests/phase-b-passive-recall.test.js` | `::Group(tag)`, `::TagMemo+1.8 ::Rerank`, recall audit `semanticCandidateCount`, `rerankMode`, `rrfAlpha`, `queryAxes`, `metaThinkingScore` | Main passive TagMemo baseline | Uses temp diary entries; no reusable fixture file or report snapshot |
| `tests/phase-b-sync-cache-rerank.test.js` | EPA terrain analysis, meta-thinking reasons, geodesic rerank signal, profile-controlled tag/core/geodesic ranges, candidate diary score | Telemetry and profile baseline | Not a donor parity matrix; no TagMemo vs no-TagMemo ordering snapshot |
| `tests/phase-c-lightmemo-boundary.test.js` | LightMemo `tag_boost`, `core_tags`, rerank translation, tag/title/body ordering | LightMemo donor option compatibility | No standalone TagMemo fixture with sanitized reusable input/output |
| `tests/rebuild-profile-cli.test.js` | profile migration suite includes `tagmemo-geodesic`; v8-diagnose CLI outputs terrain/residual/tagMemo/metaThinking | Profile/diagnostic evidence | Not a recall parity test; should stay read-only and not become provider benchmark |
| `benchmarks/active-memory-suite/standard-suite.json` | DeepMemo / TopicMemo donor categories including `query-semantics` and `ordering` | Donor parity standing gate context | Does not cover passive TagMemo or LightMemo semantic association directly |
| `benchmarks/real-query-suite/v1.json` and `benchmarks/default-dataset.json` | Query-quality fixture suite includes semantic routing bias case | Query-quality baseline | No TagMemo directive, semantic grouping, or telemetry assertions |

## Current Fixture Assets

There is no dedicated P16 TagMemo fixture file yet.

Existing related fixture assets:

- `tests/fixtures/donor-ranking-tie-breaker-parity-v1.json`: DeepMemo ordering snapshots, not passive TagMemo.
- `tests/fixtures/deepmemo-donor-parity-v1.json`: DeepMemo payload and syntax coverage, not passive TagMemo.
- `tests/fixtures/topicmemo-donor-parity-v1.json`: TopicMemo payload and errors, not passive TagMemo.
- `benchmarks/profile-migration-suite.json`: contains `tagmemo-geodesic` and `v8-terrain` query IDs for profile diagnostics.
- `benchmarks/real-query-suite/v1.json`: query-quality fixture assertions without TagMemo directives.

## Gap Register

| Gap | Why it matters | Recommended P16.2 fixture target |
|---|---|---|
| Dedicated TagMemo directive matrix missing | Need stable evidence for `::TagMemo`, `::TagMemo(N)`, `::TagMemo+N`, malformed values, and clamp behavior | Add fixture rows for parsed directive, geodesic flag, normalized weight, and no mutation |
| Tag/title/body/evidence score separation missing | Current runtime tests prove ordering but not contribution boundaries | Add sanitized records with tag-only, title-only, body-only, and evidence-only hits |
| Dynamic weight range snapshot missing | Profile ranges can change TagMemo behavior silently | Add fixture expectations for min/max clamp and profile-controlled dynamic weights |
| `::TagMemo` vs `::TagMemo+` behavior not isolated | Plus form enables geodesic rerank; non-plus form should remain non-geodesic | Add side-by-side fixture assertions for directive mode and rerank mode |
| Semantic grouping with TagMemo missing | `::Group(tag)` exists, but not combined with TagMemo weight and time/rerank variants | Add grouping fixture with matched tag buckets and stable first-round interleaving |
| Recall audit TagMemo schema not locked | Audit consumers need stable telemetry fields | Add report-shape fixture for `matchedTags`, `coreTags`, `queryAxes`, `metaThinking*`, `semanticCandidateCount`, `rerankMode` |
| LightMemo option-to-TagMemo mapping lacks reusable fixture | LightMemo boundary tests use temp data but no fixture artifact | Add fixture for `tag_boost`, `core_tags`, `rerank`, and compatibility query output |
| Query-quality interaction missing | P15 query suite does not exercise TagMemo directives | Add fixture-only query cases that forbid fake quality scores and provider calls |
| Donor intentional-difference list missing for P16 | P16 should know what not to chase blindly | Add allowlist section for safer-than-donor differences before runtime tuning |

## Proposed P16.2 Scope

Recommended next phase:

`P16.2-TagMemo-semantic-fixture-shape-tests`

Completed P16.2 shape-test scope:

- Added `tests/fixtures/tagmemo-semantic-fixture-shape-v1.json`.
- Added `tests/tagmemo-semantic-fixture-shape.test.js`.
- Locked directive parsing, tag/title/body/evidence scoring contribution shape, telemetry keys, LightMemo option-to-TagMemo mapping, and no-side-effect policy.
- Kept runtime ranking, recall implementation, providers, MCP tools, and durable memory untouched.

Forbidden:

- Runtime ranking tuning.
- Changes to `src/recall/*`.
- New public MCP tools or schema changes.
- Provider smoke / benchmark.
- Real memory preview, DB write, SQLite migration, import/export apply.
- V8 implementation.

## Validation Recommendation

For P16.1 inventory:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

For P16.2 fixture tests:

```powershell
node --test tests\tagmemo-semantic-fixture-shape.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Boundary Confirmation

P16.1 is docs/inventory only. It does not modify runtime, tests, fixtures, package scripts, MCP contracts, providers, durable memory, SQLite schema, import/export behavior, or V8 implementation.

## P16.3 Follow-up

`P16.3-TagMemo-targeted-semantic-fixtures` adds targeted synthetic temp-workspace cases after the P16.2 shape test. The current P16.3 fixture is `tests/fixtures/tagmemo-targeted-semantic-v1.json`, with test coverage in `tests/tagmemo-targeted-semantic-fixture.test.js`; targeted `3/3`, full suite `429/429`, diff check, and docs validation passed locally.

P16.3 remains fixture/test only. It does not modify runtime ranking, recall implementation, providers, public MCP tools, SQLite schema, import/export behavior, durable memory, or V8 implementation.
