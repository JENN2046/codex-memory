# P16 TagMemo Semantic Association Parity Plan

更新时间：2026-05-14

## Phase

`P16-TagMemo-semantic-association-parity-planning`

## Purpose

P16 starts the TagMemo / semantic association parity line after P15 query-quality closeout. This phase is planning-only: it identifies the existing recall surfaces, fixture gaps, safety boundaries, and validation sequence before any runtime change.

The goal is to make TagMemo association behavior measurable and auditable without tuning ranking by guesswork.

## Current Baseline

- Start baseline: local `main` and `origin/main` matched at `c8ffe68` before P16 planning edits.
- Latest runtime safety baseline: `41a5630 fix: add validate memory two phase audit`.
- P14 donor parity standing gate: standard-suite compare `43/43 matched`, rollback `43/43 rollback-ready`.
- P15 query-quality standing gate: fixture recall dry-run `14/14`, `mutated=false`, `providerCalls=0`, `durableMemoryTouched=false`.
- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.
- `validate_memory` remains internal-only.

## Existing Surfaces To Protect

- `src/recall/TagMemoEngine.js`: query analysis, explicit `::TagMemo` weighting, dynamic tag/core weighting, record scoring, and meta-thinking score surface.
- `src/recall/EPAModule.js`: EPA axes, resonance, semantic width, terrain basis, and energy signature.
- `src/recall/ResidualPyramid.js`: residual levels and coverage / novelty / breadth / TagMemo activation features.
- `src/recall/SemanticGroupManager.js`: grouping by matched tags, day, and target.
- `src/recall/KnowledgeBaseRecallPipeline.js` and `src/recall/CandidateGenerator.js`: candidate generation and recall-chain integration.
- Passive query syntax around `::TagMemo`, `::TagMemo+N`, `::Rerank`, `tag_boost`, and `core_tags`.
- Existing tests in `tests/phase-b-passive-recall.test.js`, `tests/phase-b-sync-cache-rerank.test.js`, and `tests/phase-c-lightmemo-boundary.test.js`.
- `src/cli/v8-diagnose.js` can provide later read-only evidence, but P16 planning must not become P17 / V8 implementation.

## Gate Categories

P16 should turn the following into fixture-backed evidence, in order:

1. TagMemo directive parsing and weight normalization.
2. Core tag extraction and explicit `core_tags` / `tag_boost` behavior.
3. Tag / title / body / evidence scoring separation.
4. Semantic grouping and diversification behavior.
5. RRF / geodesic / TagMemo score contribution snapshots.
6. EPA / ResidualPyramid telemetry shape, read-only at first.
7. Ordering and tie-breaker stability for donor-like "feel".
8. Intentional difference allowlist for behavior that is safer than donor behavior.
9. Query-quality interaction, including no fake `hitRate` / `qualityScore`.

## Planned Sequence

1. `P16-TagMemo-semantic-association-parity-planning`: this document and board/status alignment only.
2. `P16.1-TagMemo-semantic-fixture-inventory`: inventory current tests, fixtures, query forms, and missing dimensions.
3. `P16.2-TagMemo-semantic-fixture-shape-tests`: add synthetic fixture shape tests for directive parsing, scoring contribution, telemetry keys, LightMemo mapping, and no-side-effect policy without runtime tuning.
4. `P16.3-TagMemo-targeted-semantic-fixtures`: add targeted sanitized semantic association cases after shape tests are stable.
5. `P16.4-semantic-ranking-evidence-gate`: summarize ranking evidence and compare/query-quality interactions.
6. `P16.5-compare-rollback-semantic-gate`: run standing compare/rollback evidence where applicable.
7. `P16.x-closeout-review`: confirm evidence, gaps, and readiness for P17 planning only.

## Current Phase Boundary

Allowed in this P16 planning slice:

- Add this planning document.
- Update roadmap / status / backlog / `.agent_board`.
- Reference existing source and tests as evidence.
- Run docs-only validation.

Forbidden in this P16 planning slice:

- Runtime implementation or ranking tuning.
- New public MCP tools or schema changes.
- `validate_memory` public exposure.
- Provider smoke / benchmark.
- V8 implementation or advanced intelligence changes.
- Real DB / durable memory mutation.
- SQLite migration or `ALTER TABLE`.
- Import/export apply.
- Dependency or lockfile changes.
- Tag, release, deploy, or destructive cleanup.

## Validation Plan

Planning slice:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future fixture/test slices may use:

```powershell
node --test tests\phase-b-passive-recall.test.js tests\phase-b-sync-cache-rerank.test.js tests\phase-c-lightmemo-boundary.test.js
npm test
npm run gate:ci
```

Compare / rollback gates should be added only when a P16 slice touches donor-facing ordering or active-memory compatibility evidence.

## Risks

- Current TagMemo behavior already exists, but parity evidence is partial and spread across runtime tests.
- EPA / ResidualPyramid signals can be over-interpreted; P16 should lock evidence shape before tuning.
- RAG profile ranges and V8 diagnostics are related surfaces, not automatic P16 implementation scope.
- Donor-like ordering should be measured with fixtures before changing any score weights.

## Result

P16 planning and P16.1 inventory are complete. P16.2 adds fixture shape tests only; it does not tune runtime ranking or start V8.
