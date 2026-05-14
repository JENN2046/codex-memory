# CHECKPOINT.md — codex-memory

## Current Goal

P14.2-DeepMemo-targeted-parity-fixtures: add DeepMemo targeted fixture/test evidence without changing runtime behavior.

## Current Area

P14-donor-compatibility / DeepMemo fixtures

## Current Status

P14.1 donor parity fixture inventory has landed on `origin/main`. Current HEAD/base before this batch is `0bb8db6`.

Current decision: keep `validate_memory` internal-only and do not enter public `validate_memory` MCP proposal review. P14.2 is fixture/test/docs/board only. It does not change DeepMemo runtime behavior, TopicMemo behavior, passive memory query behavior, import/export, migration, MCP schema/tools, DB/diary data, or durable memory.

## Completed Work In This Batch

- Added `tests/fixtures/deepmemo-donor-parity-v1.json`.
- Added `tests/deepmemo-donor-parity-fixture.test.js`.
- Locked DeepMemo success payload shape for a donor-style success envelope.
- Locked blocked keyword diagnostics under `meta` and verified no blocked/effective fields leak to top-level output.
- Locked advanced syntax payload stability.
- Locked a three-window ranking order snapshot.
- Verified the targeted test does not mutate active-memory fixture files by hashing relevant fixture files before and after the CLI runs.
- Updated P14 plan, fixture inventory, next phase plan, backlog, status, and board pointers.

## Changed Files

- `tests/fixtures/deepmemo-donor-parity-v1.json`
- `tests/deepmemo-donor-parity-fixture.test.js`
- `docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md`
- `docs/DONOR_PARITY_FIXTURE_INVENTORY.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `node --test tests\deepmemo-donor-parity-fixture.test.js` passed `2/2`.
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category query-semantics,filtering,ordering --tool deepmemo --json --require-match` passed `15/15 matched`.
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category query-semantics,filtering,ordering --tool deepmemo --json --require-ready` passed `15/15 rollback-safe`.
- `npm test` passed `403/403`.
- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## Validation Not Run

- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No import/export runtime.
- No runtime mapper.
- No donor runtime behavior change.
- No real DB/memory write.
- No real DB/diary write.
- No P15/P16/P17/V8/UI.

## Current Blockers

- None currently.
- Public MCP tool expansion remains blocked until explicit proposal approval.

## Remaining Risks

- TopicMemo targeted parity fixtures remain for P14.3.
- Passive memory query donor parity fixtures remain future work.
- Runtime changes remain out of scope until fixture/gate evidence exists and a later phase explicitly approves implementation.

## Next Safe Action

Inspect the final diff and file scope, then guarded local commit and safe-push readiness if clean. Next phase is `P14.3-TopicMemo-targeted-parity-fixtures`.
