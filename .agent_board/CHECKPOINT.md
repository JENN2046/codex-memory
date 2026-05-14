# CHECKPOINT.md — codex-memory

## Current Goal

P14.1-donor-parity-fixture-inventory: inventory current donor parity fixtures and standard suite gaps without changing runtime behavior.

## Current Area

P14-donor-compatibility / fixture-inventory

## Current Status

P14 donor behavior parity gate planning has landed on `origin/main`. Current HEAD/base before this batch is `af30991`.

Current decision: keep `validate_memory` internal-only and do not enter public `validate_memory` MCP proposal review. P14.1 inventory is docs/board only. It does not change DeepMemo, TopicMemo, passive memory query behavior, import/export, migration, MCP schema/tools, DB/diary data, or durable memory.

## Completed Work In This Batch

- Added `docs/DONOR_PARITY_FIXTURE_INVENTORY.md`.
- Inventoried the current standard suite: `43` cases, DeepMemo `24`, TopicMemo `19`, success `24`, error `19`.
- Recorded category distribution across agent-selection, fallback, filtering, input-validation, ordering, query-semantics, topic-navigation, and topic-state.
- Recorded fixture distribution across `7` fixture roots.
- Logged gap register for passive query parity, known intentional differences, object-model drift markers, TopicMemo ordering, DeepMemo payload snapshots, error/meta matrix, and README suite count drift.
- Updated P14 plan, next phase plan, backlog, status, and board pointers.

## Changed Files

- `docs/DONOR_PARITY_FIXTURE_INVENTORY.md`
- `docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## Validation Not Run

- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No import/export runtime.
- No runtime mapper.
- No donor runtime behavior change.
- No tests or fixtures added in P14.1.
- No real DB/memory write.
- No real DB/diary read.
- No P14 implementation.

## Current Blockers

- None currently.
- Public MCP tool expansion remains blocked until explicit proposal approval.

## Remaining Risks

- README suite count drift remains documented but not fixed in this phase.
- Runtime changes remain out of scope until fixture/gate evidence exists and a later phase explicitly approves implementation.

## Next Safe Action

Inspect the final diff and file scope, then guarded local commit and safe-push readiness if clean. Next phase is `P14.2-DeepMemo-targeted-parity-fixtures`.
