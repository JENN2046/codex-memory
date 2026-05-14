# HANDOFF.md — codex-memory

## Goal

Continue `P14.2-DeepMemo-targeted-parity-fixtures` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: `main`
- Base: `origin/main` / `0bb8db6`
- Remote policy: A4.8 safe-push is allowed only after readiness is ready

## Current Area

P14-donor-compatibility / DeepMemo fixtures

## Completed Before This Batch

- P12 controlled write planning through P12.6 internal validate_memory CLI wrapper landed.
- P13 VCP-compatible memory object model chain through P13.x closeout review landed.
- P14 donor behavior parity gate planning landed.
- P14.1 donor parity fixture inventory landed.
- Decision after P12.6: keep `validate_memory` internal-only and skip public `validate_memory` MCP proposal review.

## Completed In Current Batch

- Added `tests/fixtures/deepmemo-donor-parity-v1.json`.
- Added `tests/deepmemo-donor-parity-fixture.test.js`.
- Locked DeepMemo payload shape, blocked keyword meta placement, advanced syntax payload stability, and three-window ranking order.
- Verified targeted fixture runs do not mutate the referenced active-memory fixture files.
- Updated P14 plan, inventory, next phase plan, backlog, status, and board state.

## Changed Files

- `tests/fixtures/deepmemo-donor-parity-v1.json`
- `tests/deepmemo-donor-parity-fixture.test.js`
- `docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md`
- `docs/DONOR_PARITY_FIXTURE_INVENTORY.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `node --test tests\deepmemo-donor-parity-fixture.test.js` passed `2/2`.
- DeepMemo compare category gate passed `15/15 matched`.
- DeepMemo rollback category gate passed `15/15 rollback-safe`.
- `npm test` passed `403/403`.
- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- No MCP public tool definitions are changed.
- No MCP schema is changed.
- `validate_memory` remains internal-only.

## Audit / Recall Impact

- P14.2 fixture tests exercise DeepMemo CLI against fixture roots only.
- Runtime recall behavior is unchanged.
- Audit write paths are unchanged.

## Not Done

- No public MCP `validate_memory`.
- No MCP schema change.
- No `src/` changes.
- No package or lockfile changes.
- No DeepMemo runtime behavior change.
- No TopicMemo runtime behavior change.
- No passive memory query behavior change.
- No SQLite migration or automatic `ALTER TABLE`.
- No import/export CLI.
- No import/export file generation.
- No runtime mapper.
- No real DB write.
- No real diary write.
- No P15/P16/P17/V8/UI.
- No hard delete.
- No real DB/memory write.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No other mutation tools.

## Remaining Risks

- Public MCP tool expansion remains explicitly approval-gated.
- Real migration remains separately approval-gated.
- P14.3 may add TopicMemo fixture/test evidence, but must not alter runtime behavior without later explicit approval.

## Next Safe Step

Inspect final diff/file scope, then guarded local commit and safe-push readiness if clean. Next recommended phase is `P14.3-TopicMemo-targeted-parity-fixtures`.
