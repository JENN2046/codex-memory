# P16 Compare / Rollback Semantic Gate

Phase: `P16.5-compare-rollback-semantic-gate`

Status: completed locally

## Purpose

P16.5 records the compare / rollback evidence that is applicable before P16 closeout. It links the new TagMemo semantic fixtures to the existing donor ordering gates without pretending that donor active-memory ordering is the same as passive TagMemo runtime quality.

This is an evidence and guardrail phase. It does not tune ranking behavior.

## Validation Evidence

| Gate | Command | Result |
|---|---|---|
| TagMemo semantic fixtures | `node --test tests\tagmemo-semantic-fixture-shape.test.js tests\tagmemo-targeted-semantic-fixture.test.js` | `9/9` passed |
| Donor ordering compare | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-match` | `4/4 matched` |
| Donor ordering rollback | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-ready` | `4/4 rollback-ready` |

The donor ordering gates cover these standard-suite cases:

- `deepmemo-multi-topic-order-success`
- `deepmemo-large-multi-topic-order-success`
- `deepmemo-ranking-window-order-success`
- `deepmemo-ranking-three-window-order-success`

## Interpretation

P16.5 result: `PASS_WITH_SCOPE_LIMITS`.

What the evidence proves:

- P16.2/P16.3 TagMemo fixtures still pass together.
- Existing donor ordering compatibility remains matched for the ordering category.
- Rollback readiness remains green for the ordering category.
- No TagMemo runtime tuning was required to preserve these gates.

What the evidence does not prove:

- It does not prove live passive-memory query quality.
- It does not prove provider-backed semantic quality.
- It does not prove V8 / advanced memory intelligence behavior.
- It does not authorize changing ranking weights.
- It does not authorize migration, import/export apply, public MCP expansion, or real memory mutation.

## Boundary Confirmation

P16.5 does not:

- modify `src/`
- tune ranking weights
- call providers
- run provider smoke / benchmark
- read or mutate real durable memory
- change SQLite schema or run migration
- apply import/export
- change package manifests or lockfiles
- expand public MCP tools or schemas
- expose `validate_memory` publicly
- start P17 / V8 implementation
- tag, release, or deploy

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

`validate_memory` remains internal-only.

## Closeout Recommendation

P16 can proceed to `P16.x-closeout-review`.

The closeout should state that P16 is fixture-backed and compare/rollback-checked, but still not a live quality or V8 intelligence gate. P17 must start with planning / evidence only, not implementation, unless a later phase produces an explicit approval packet for A5 behavior.
