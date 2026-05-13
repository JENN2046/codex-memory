# CHECKPOINT.md — codex-memory

## Current Goal

P11.x-stale-branch-quarantine-and-doc-salvage：在 `origin/main` 基线上记录
`codex/p1-vcp-memory-core-100-roadmap` 的 stale branch 审查结论，并只做文档/board
层面的 salvage。

## Current Area

P6-docs-drift / stale-branch-quarantine

## Current Status

当前是 A1 docs/board-only 阶段。基线为 `origin/main` / `180eec4`。旧分支
`codex/p1-vcp-memory-core-100-roadmap` 已确认 diverged：ahead 20、behind 38、
merge base `7d634bb`。

本阶段不 merge、不 rebase、不 cherry-pick 旧分支；不改 `src/`、tests、
`package.json`、`.env`、依赖、runtime、SQLite 或真实数据。

## Completed Work In This Batch

- Added stale branch review for `codex/p1-vcp-memory-core-100-roadmap`.
- Marked the old branch as superseded stale reference branch.
- Recorded that future development base remains `origin/main`.
- Added current-main personal production readiness guidance.
- Updated next-phase, roadmap, status, maintenance backlog, and board state.

## Changed Files

- `docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md`
- `docs/PERSONAL_PRODUCTION_READINESS.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `docs/VCP_MEMORY_PARITY_ROADMAP.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `git diff --check`：passed
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`：passed
- Manual check for `docs/PERSONAL_PRODUCTION_READINESS.md`：passed; no old tag as current fact, no stale-branch merge claim, no secret value example, no obsolete gate command, no conflict with parity roadmap boundary.

## Validation Not Run

- No `npm test`; this batch does not touch runtime/tests/package.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No merge / rebase / cherry-pick of the stale branch.
- No push / tag / release / deploy.

## Current Blockers

- None for docs/board quarantine.

## Remaining Risks

- P11.8 runtime implementation is still future work.
- Stale branch content must stay read-only reference only; future agents must not reuse old runtime, test, package, or board changes.

## Next Safe Action

Validate docs, stop without push, then return to
`P11.8-lifecycle-read-policy-runtime-flag-implementation`.
