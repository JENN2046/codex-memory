# P17 Advanced Memory Intelligence / V8 Evidence Gate Plan

Phase: `P17-advanced-memory-intelligence-v8-evidence-gate-planning`

Status: completed locally

## Purpose

P17 starts after P16 closed as `FIXTURE_BACKED_AND_GATE_CHECKED`.

The goal of P17 is not to implement new V8 behavior immediately. The goal is to define evidence gates for advanced memory intelligence surfaces that already exist in read-only or runtime-adjacent form, then decide which future slices may safely add fixtures, diagnostics, or runtime changes.

## Current Surfaces

Observed local surfaces:

- `src/cli/v8-diagnose.js`: read-only diagnostic report for terrain, residual pyramid, TagMemo weights, meta-thinking, geodesic intent, and embedding profile metadata.
- `src/recall/TagMemoEngine.js`: query analysis, dynamic tag/core weights, EPA / ResidualPyramid derived metrics, and meta-thinking signals.
- `src/recall/EPAModule.js`: terrain basis, dominant axes, resonance, semantic width, entropy, and energy signature.
- `src/recall/ResidualPyramid.js`: residual levels, coverage, novelty, breadth, and TagMemo activation features.
- `src/recall/RerankService.js`: geodesic rerank signal composition and local rerank score blending.
- Existing tests:
  - `tests/phase-b-sync-cache-rerank.test.js`
  - `tests/rebuild-profile-cli.test.js`
  - `tests/tagmemo-semantic-fixture-shape.test.js`
  - `tests/tagmemo-targeted-semantic-fixture.test.js`

## P17 Gate Categories

1. Diagnostic shape stability:
   - `v8-diagnose` JSON top-level keys.
   - `embeddingProfile` redaction and profile metadata.
   - `query` normalized / directive / time range shape.
   - `terrain`, `residualPyramid`, `tagMemo`, `metaThinking`, `geodesic` shape.

2. Read-only evidence safety:
   - `destructive=false`.
   - no provider calls.
   - no durable memory writes.
   - no real memory preview unless explicitly planned and redacted.
   - no raw workspace id or secret-bearing output.

3. Semantic signal fixture coverage:
   - canonical query families for technical, governance, migration, and recall-quality topics.
   - expected dominant axes / terrain activation ranges.
   - expected residual levels and meta-thinking reasons.
   - TagMemo / geodesic intent shape for `::TagMemo`, `::TagMemo+N`, `::Rerank`, and `::Rerank+N`.

4. Query-quality interaction:
   - prove that diagnostic signals can be reported without fake `hitRate` / `qualityScore`.
   - keep P15 fixture recall dry-run as the default quality baseline.
   - avoid runtime ranking changes until evidence proves need and risk is scoped.

5. Policy and lifecycle compatibility:
   - advanced diagnostics must not bypass scope, lifecycle, privacy, audit, or controlled write boundaries.
   - public MCP tools remain frozen.
   - `validate_memory` remains internal-only.

## Planned Sequence

1. `P17-advanced-memory-intelligence-v8-evidence-gate-planning`: this document and board/status alignment only.
2. `P17.1-v8-diagnostic-surface-inventory`: inventory existing V8 / EPA / ResidualPyramid / geodesic / meta-thinking tests and output fields.
3. `P17.2-v8-diagnostic-fixture-shape-tests`: add synthetic fixture shape tests for `v8-diagnose` and TagMemo analysis output without runtime tuning.
4. `P17.3-v8-report-schema-gate`: lock JSON schema and forbidden fields for diagnostic reports.
5. `P17.4-advanced-signal-query-quality-interaction`: summarize interaction with P15 fixture recall dry-run; no fake quality metrics.
6. `P17.5-advanced-signal-standing-gate`: decide which diagnostic commands can become standing local gates.
7. `P17.x-closeout-review`: confirm evidence, remaining gaps, and readiness for P18 planning only.

## Current Phase Boundary

Allowed in this P17 planning slice:

- Add this planning document.
- Update `STATUS.md`, `MAINTENANCE_BACKLOG.md`, `CODEX_MEMORY_NEXT_PHASE_PLAN.md`, and `.agent_board`.
- Reference existing source/tests/docs as evidence.
- Run docs-only validation.

Forbidden in this P17 planning slice:

- V8 runtime implementation.
- Runtime ranking tuning.
- Provider smoke / benchmark.
- Real memory read preview.
- Real DB or durable memory mutation.
- SQLite migration or `ALTER TABLE`.
- Import/export apply.
- New public MCP tools or schema changes.
- Public `validate_memory`.
- Dependency or lockfile changes.
- UI, release candidate, tag, release, or deploy.

## Validation Plan

Planning slice:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future fixture/test slices may use:

```powershell
npm run v8-diagnose -- --json --query "[[checkpoint migration]] ::TagMemo+1.5 ::Rerank+0.4"
node --test tests\rebuild-profile-cli.test.js tests\phase-b-sync-cache-rerank.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Provider commands remain excluded unless a later explicit approval packet authorizes them.

## Risks

- V8 terminology can make diagnostics look like implementation parity. P17 must separate read-only evidence from runtime behavior.
- Terrain and meta-thinking scores can be over-interpreted as quality metrics. They are diagnostic signals, not hit-rate proof.
- Provider-backed semantic quality is outside this planning slice.
- Runtime tuning may affect recall quality and rollback expectations; it requires a later scoped phase and validation matrix.

## Result

P17 planning is ready for docs validation. The next safe phase after this planning slice is `P17.1-v8-diagnostic-surface-inventory`.
