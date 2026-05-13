# CHECKPOINT.md — codex-memory

## Current Goal

P11.8-lifecycle-read-policy-runtime-flag-implementation：在 `origin/main` 基线上实现默认关闭的
`CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY`，让开启后的普通 `search_memory` 按 lifecycle
status 过滤结果，同时保持默认关闭的 backward-compatible 行为。

## Current Area

P11-memory-lifecycle-core / lifecycle-read-policy-runtime

## Current Status

P11.8 runtime implementation 已本地完成并验证。当前分支为 `main`，基线为
`origin/main` / `63482b4`。

本阶段没有 merge、rebase、cherry-pick `codex/p1-vcp-memory-core-100-roadmap`，没有 push/tag/release/deploy。

## Completed Work In This Batch

- Added `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` config flag with default `false`.
- Added read-only lifecycle status lookup for candidate `memory_id` values.
- Added post-filter runtime behavior for ordinary `search_memory` when the lifecycle flag is enabled.
- Preserved default-off behavior so proposal/rejected/superseded/tombstoned remain visible when the flag is false.
- Added fail-safe missing-column behavior when the flag is true.
- Added read-policy audit summary fields without raw `workspace_id`.
- Added runtime tests for enabled/disabled behavior, missing columns, audit shape, and MCP public tools.
- Updated lifecycle read-policy docs, status, backlog, and board.

## Changed Files

- `src/config/createConfig.js`
- `src/app.js`
- `src/storage/SqliteShadowStore.js`
- `src/recall/RecallAuditService.js`
- `tests/lifecycle-read-policy-runtime.test.js`
- `docs/MEMORY_LIFECYCLE_READ_POLICY_RUNTIME_IMPLEMENTATION_PLAN.md`
- `docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `node --test tests\lifecycle-read-policy-runtime.test.js`：passed `6/6`
- `node --test tests\lifecycle-read-policy-runtime-fixture.test.js`：passed `10/10`
- `node --test tests\mcp-contract.test.js`：passed `7/7`
- `npm test`：initial concurrent run exposed dashboard/gate transient drift while HTTP health was down; after `npm run start:http:ensure`, rerun passed `233/233`
- `npm run gate:ci`：passed
- `npm run gate:mainline:strict`：passed after HTTP ensure; health `200`, contract `12/12`, tests `233/233`, compare `43/43`, rollback `43/43`
- `npm run scope:acceptance -- --json`：passed, `status=ok`
- `npm run lifecycle:sqlite:dry-run -- --json`：passed, `mutated=false`

## Validation Not Run

- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No push / tag / release / deploy.

## Current Blockers

- None for local implementation.

## Remaining Risks

- P11.8 adds runtime filtering only behind a default-off flag; any future default-on or admin/audit mode work needs a separate phase.
- Future SQL pushdown for lifecycle status is still deferred and should not replace the post-filter safety net without tests.

## Next Safe Action

Run final diff/docs checks, then stop without push. If requested later, prepare a guarded local commit for the P11.8 batch.
