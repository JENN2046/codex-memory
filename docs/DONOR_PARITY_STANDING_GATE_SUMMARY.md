# P14 Donor Parity Standing Gate Summary

## Purpose

P14.6 summarizes the donor behavior parity gate evidence accumulated through P14.1-P14.5.

This phase is docs and board only. It does not change DeepMemo, TopicMemo, passive memory query behavior, public MCP tools, MCP schemas, import/export behavior, migration behavior, SQLite schema, or real memory data.

The goal is to make donor parity review repeatable before any later runtime behavior change.

## Standing Gate Scope

The standing donor parity gate currently covers:

- DeepMemo payload shape, query semantics, filtering, ordering, agent selection, and error/meta behavior.
- TopicMemo payload shape, topic navigation, topic state errors, agent selection, and error/meta behavior.
- Active-memory compare harness parity against legacy donor fixtures.
- Rollback readiness for every comparable standard-suite case.
- Known intentional differences documented by targeted fixtures.
- Object-model drift boundary: P14 may expose drift, but P13 fixtures must be updated before any object-model rewrite is accepted.

## Standard Suite Evidence

Latest standing gate smoke was run with:

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

Observed result:

- Compare: `43/43 matched`
- Rollback: `43/43 rollback-ready`
- Categories: `8`
- Fixture roots: `7`
- Core mismatch total: `0`
- Extended mismatch total: `0`
- Legacy unavailable cases: `0`
- Mutation: none; fixture-backed compare/rollback only

## Category Matrix

| Category | Case Count | Current Standing |
|---|---:|---|
| `input-validation` | 9 | matched and rollback-ready |
| `query-semantics` | 2 | matched and rollback-ready |
| `filtering` | 9 | matched and rollback-ready |
| `fallback` | 2 | matched and rollback-ready |
| `ordering` | 4 | matched and rollback-ready |
| `agent-selection` | 8 | matched and rollback-ready |
| `topic-navigation` | 4 | matched and rollback-ready |
| `topic-state` | 5 | matched and rollback-ready |

## Targeted Fixture Evidence

| Phase | Evidence | Result |
|---|---|---|
| P14.1 | `docs/DONOR_PARITY_FIXTURE_INVENTORY.md` | Inventory captured `43` standard-suite cases, `8` categories, and `7` fixture roots |
| P14.2 | `tests/fixtures/deepmemo-donor-parity-v1.json`; `tests/deepmemo-donor-parity-fixture.test.js` | DeepMemo targeted fixture passed; DeepMemo category gates passed `15/15` |
| P14.3 | `tests/fixtures/topicmemo-donor-parity-v1.json`; `tests/topicmemo-donor-parity-fixture.test.js` | TopicMemo targeted fixture passed; TopicMemo category gates passed `13/13` |
| P14.4 | `tests/fixtures/donor-error-meta-parity-v1.json`; `tests/donor-error-meta-parity-fixture.test.js` | Error/meta targeted fixture passed; shared category gates passed `31/31` |
| P14.5 | `tests/fixtures/donor-ranking-tie-breaker-parity-v1.json`; `tests/donor-ranking-tie-breaker-parity-fixture.test.js` | Ranking/tie-breaker targeted fixture passed; ordering gate passed `4/4` |

## Readiness Judgment

P14 donor parity is fixture/gate ready for planning the next phase.

This does not mean runtime behavior can be changed freely. Any future donor behavior change must:

- update or add targeted fixtures first
- run affected compare/rollback category gates
- run `npm test`
- preserve public MCP tool freeze unless a dedicated approved MCP phase says otherwise
- update P13 object-model fixtures if object-model drift appears
- preserve import/export and migration boundaries until separately approved

## Boundary Confirmation

- `validate_memory` remains internal-only.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- No public MCP tool expansion occurred in P14.
- No MCP schema change occurred in P14.
- No SQLite migration or `ALTER TABLE` occurred in P14.
- No import/export runtime implementation occurred in P14.
- No real DB, diary, or durable memory write occurred in P14.
- No provider smoke or provider benchmark was run for P14.
- No tag, release, deploy, P16, P17, V8, or UI work occurred in P14.

## Remaining Risks

- Passive memory query donor parity is still mostly represented through active-memory donor gates and should be planned explicitly in a later phase.
- Real query quality remains a P15 concern and must not be inferred from donor parity alone.
- TagMemo / semantic association parity remains P16 and must not start before P15 planning.
- Advanced memory intelligence / V8 evidence remains P17 and must not start early.
- Runtime donor behavior changes still require fixture updates and explicit scope.

## Next Recommended Phase

`P15-real-query-quality-gate-planning`

P15 should start as planning / fixture / gate design. It should not jump to P16 TagMemo, P17 V8, UI, migration apply, provider benchmarks, or public MCP expansion.
