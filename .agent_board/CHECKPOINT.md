# CHECKPOINT.md — codex-memory

## Current Goal

P11.10-lifecycle-read-policy-observability-dashboard-summary：把 lifecycle read-policy 状态同步到
`dashboard`、`observe:http` 和 `governance:report` 的只读可观测面。

## Current Area

P11-memory-lifecycle-core / observability

## Current Status

P11.10 本地实现已完成。当前基线为 `main` / `origin/main` / `729b75a`。

本阶段只改 observability/reporting、测试、文档和 board；不改 `search_memory` runtime 行为，
不新增 MCP public tools，不做 SQLite migration，不 push。

## Completed Work In This Batch

- Added shared low-risk lifecycle/read-policy surface in `governance-report`.
- Added `readPolicy` summary to dashboard JSON/text output.
- Added `readPolicy` summary to `observe:http` JSON/text output.
- Added `readPolicy` and `review.readPolicy` to `governance:report`.
- Aggregated recent recall audit fields for hidden/stale counts and lifecycle column availability.
- Kept raw `workspace_id` out of JSON/text output; only `scopeWorkspacePresent` boolean is exposed.
- Updated dashboard / http-observe / governance-report tests.
- Updated runtime policy docs, lifecycle implementation plan, status, backlog, and board state.

## Changed Files

- `src/cli/dashboard.js`
- `src/cli/http-observe.js`
- `src/cli/governance-report.js`
- `tests/dashboard-cli.test.js`
- `tests/http-observe-cli.test.js`
- `tests/governance-report-cli.test.js`
- `docs/runtime-policy-gates.md`
- `docs/MEMORY_LIFECYCLE_READ_POLICY_RUNTIME_IMPLEMENTATION_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `node --test tests\dashboard-cli.test.js`：passed `4/4`
- `node --test tests\http-observe-cli.test.js`：passed `2/2`
- `node --test tests\governance-report-cli.test.js`：passed `3/3`
- `npm run dashboard -- --json`：passed, includes `readPolicy.status=unavailable` on current local empty audit state
- `npm run observe:http -- --json`：passed, includes `readPolicy` and summary read-policy fields
- `npm run governance:report -- --json`：passed, includes `readPolicy` and `review.readPolicy`
- `npm test`：passed `233/233`
- `npm run gate:ci`：PASS
- `git diff --check`：passed
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`：passed

## Validation Pending

- None for this phase.

## Validation Not Run

- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No push / tag / release / deploy.

## Current Blockers

- None.

## Remaining Risks

- `readPolicy.status=unavailable` can appear when no recent read-policy audit entry exists; this is a reporting state only.

## Next Safe Action

Stop without push. Next recommended step is P11.10 guarded local commit.
