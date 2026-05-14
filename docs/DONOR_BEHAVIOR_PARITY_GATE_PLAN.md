# P14 Donor Behavior Parity Gate Plan

Date: 2026-05-14

## Purpose

P14 plans a standing donor behavior parity gate for `codex-memory`.

The goal is to make donor-compatible behavior measurable and repeatable across DeepMemo, TopicMemo, passive memory query behavior, compare reports, rollback readiness, error semantics, metadata placement, and ranking behavior.

This phase is planning only:

- no runtime change
- no donor behavior change
- no public MCP tool expansion
- no import/export or migration behavior change
- no real DB or memory write
- no provider call

## Donor Surfaces

P14 should define parity checks for these surfaces:

- DeepMemo CLI
- TopicMemo CLI
- passive memory query behavior
- active-memory compare harness
- rollback readiness harness
- error envelope
- meta placement
- sorting, ranking, and tie-breakers
- blocked keyword behavior
- empty, null, missing-history, and history-read-error behavior

Each surface should be measured through fixture-backed cases before any runtime behavior changes are considered.

## Gate Categories

The standing gate should separate donor parity into categories that can be enabled, reviewed, and expanded independently:

| Category | Goal | Initial Evidence |
|---|---|---|
| payload shape parity | Keep donor-style success payloads stable | DeepMemo / TopicMemo fixture cases and compare output |
| error semantics parity | Preserve donor-style error shape, messages, and diagnostics | invalid input, unknown command, missing agent/topic/history cases |
| ranking parity | Keep ordering and tie-breaker behavior measurable | standard active-memory suite ranking cases |
| scope/filter parity | Ensure scoped memory behavior does not break donor expectations | scope-aware fixture cases and existing scope regression evidence |
| lifecycle/read-policy interaction parity | Ensure lifecycle policy summaries do not hide donor parity drift | lifecycle read-policy fixture and observability evidence |
| object-model drift detection | Detect when donor parity exposes missing or incompatible object-model fields | P13 fixture, round-trip, mapping, import/export, and readiness checks |
| compare/rollback parity | Keep compare and rollback outputs as standing gates | category compare and rollback commands |
| known intentional differences | Keep deliberate differences explicit and reviewable | documented allowlist with reason and validation |

## Object Model Boundary

P14 may expose object-model drift.

If donor parity reveals object-model drift, the fix must update the relevant P13 artifacts before any runtime rewrite:

- object model fixture schemas
- round-trip fixture tests
- object mapping fixture tests
- dry-run mapping outputs
- import/export-safe JSON shape tests
- migration readiness report
- closeout or follow-up docs

P14 must not silently rewrite the object model. P14 must not alter import/export or migration behavior. P14 must not expand public MCP tools or change the MCP schema.

## Validation Strategy

P14 planning should lead into a fixture-first validation strategy:

- standard active-memory suite expansion
- donor parity targeted fixtures
- `compare-active-memory` category gates
- `rollback-active-memory` category gates
- `npm test`
- `npm run gate:mainline:strict`
- docs validation

Recommended command families for future implementation phases:

```powershell
node --test <targeted donor parity test>
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category <category> --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category <category> --json --require-ready
npm test
npm run gate:mainline:strict
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P14 planning itself uses docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Future Sequence

P14 should proceed in small phases:

1. `P14.1-donor-parity-fixture-inventory`
   - Inventory current standard suite and donor parity fixture gaps.
2. `P14.2-DeepMemo-targeted-parity-fixtures`
   - Add DeepMemo fixture cases for payload, blocked keyword, query syntax, and ranking boundaries.
3. `P14.3-TopicMemo-targeted-parity-fixtures`
   - Add TopicMemo fixture cases for topic listing, topic content, missing topic/history, and agent alias boundaries.
4. `P14.4-error-meta-parity-tests`
   - Lock error envelope and `meta` placement behavior.
5. `P14.5-ranking-tie-breaker-parity-tests`
   - Expand ranking and tie-breaker cases before runtime changes.
6. `P14.6-compare-rollback-standing-gate-summary`
   - Summarize standing compare/rollback category gates and readiness checks.

No runtime behavior changes should happen until fixture and gate evidence exists.

## Non-Goals

- no runtime change
- no public MCP tools
- no MCP schema change
- no import/export or migration
- no SQLite migration
- no real DB or memory write
- no provider benchmark
- no P15 real query quality
- no P16 TagMemo / semantic association
- no P17 V8
- no UI work

## Next Recommended Phase

`P14.1-donor-parity-fixture-inventory`

P14.1 should remain fixture inventory and test-design work. It should not alter runtime behavior.
