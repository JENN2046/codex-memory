# CHECKPOINT.md — codex-memory

## Current Goal

P9 — 在不写真实 DB 的前提下，把 `workspace_id` 历史回填推进到人工审查计划阶段，并同步当前本地/远端 `main` 的事实源。

## Current Area

P9-codex-claude-client-scope

## Current Status

本地/远端 `main` 当前同步到 `8b2d56b docs: sync post-pr close status`。PR #2 已按 superseded 关闭且未合并，远端分支保留用于追溯。最新只读 dry-run 显示 `450` records 中 `442` 条缺少 `workspace_id`，`mutated=false`；本轮只建立人工审查计划，不进行真实数据回填。

## Completed Work

- 从远端分支选择性恢复 package scripts、scope/query CLIs、runtime scope plumbing、storage/recall changes、query benchmark fixture 和相关 tests。
- 本地修复 `src/core/constants.js`：恢复 `client_id` / `visibility` schema enum 约束，避免 MCP contract 放宽。
- 本地修复 `src/cli/scope-backfill-dry-run.js`：`wouldUpdate` 现在覆盖仅缺 `workspace_id` 的记录，并把 `workspace_id` 标为 manual review required。
- 本地修复 `src/cli/scope-acceptance.js`：acceptance 现在覆盖 `project_id` / `workspace_id` / `client_id` / `visibility` 四维 strict isolation，并按 memory id 做 leak 检查。
- 本地修复 `src/core/MemoryWriteService.js`：保留 snake_case scope 字段，同时兼容现有 camelCase 内部调用。
- 扩展 MCP contract、scope backfill、scope acceptance 相关回归测试。
- 更新 `docs/scope-backfill-policy.md`，明确 `workspace_id` 不能自动猜测，需要人工审核。
- 创建并推送 `e1883e6 feat: integrate scoped memory runtime tools` 与 `cf660d0 docs: record scoped memory commit state`。
- 创建并推送 `8b2d56b docs: sync post-pr close status`。
- 给 PR #2 留 superseded 说明并关闭 PR；未删除远端分支。
- 运行 `scope:backfill:dry-run`，确认缺口集中在 `workspace_id`：`totalRecords=450`，`missingWorkspaceId=442`，`wouldUpdate=442`，`mutated=false`。
- 新增 `docs/WORKSPACE_ID_BACKFILL_REVIEW_PLAN.md`，明确 `workspace_id` 只能人工审查、脱敏 mapping proposal、小批量确认，不能自动猜测或批量写入。

## Changed Files

- `package.json`
- `benchmarks/real-query-suite/v1.json`
- `docs/scope-backfill-policy.md`
- `docs/WORKSPACE_ID_BACKFILL_REVIEW_PLAN.md`
- `src/app.js`
- `src/cli/gate-ci.js`
- `src/cli/mainline-gate.js`
- `src/cli/query-quality-report.js`
- `src/cli/real-query-suite.js`
- `src/cli/scope-acceptance.js`
- `src/cli/scope-backfill-dry-run.js`
- `src/core/MemoryWriteService.js`
- `src/core/constants.js`
- `src/recall/CandidateGenerator.js`
- `src/recall/ChunkIndexingService.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/recall/KnowledgeBaseSyncService.js`
- `src/storage/DiaryStore.js`
- `src/storage/SqliteShadowStore.js`
- `tests/mcp-contract.test.js`
- `tests/query-quality-report.test.js`
- `tests/real-query-suite.test.js`
- `tests/scope-acceptance-cli.test.js`
- `tests/scope-backfill-dry-run.test.js`
- `tests/scope-filter.test.js`
- `.agent_board/*`

## Validation Run

- `git diff --check` -> passed
- `node --test tests\mcp-contract.test.js tests\scope-filter.test.js tests\scope-acceptance-cli.test.js tests\scope-backfill-dry-run.test.js tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 44/44 passed
- `npm test` -> 180/180 passed
- `npm run gate:mainline:strict` -> ok; health `200`; contract 7/7; test 180/180; compare 43/43 matched; rollback 43/43 rollback-ready
- `npm run scope:acceptance -- --json` -> ok; full scope dimensions present; Project A/B found; no cross-scope leak
- `npm run scope:backfill:dry-run -- --json` -> ok; `450` total, `442` missing `workspace_id`, `mutated=false`
- `npm run query:quality -- --json` -> ok; 5 placeholder cases, 0 invalid, no mutation
- `npm run real-query-suite -- --json` -> ok; 5 placeholder cases, 5 valid, no mutation
- final status/diff scope review -> completed
- new-file trailing whitespace and high-risk token scans -> clean

## Validation Not Run

- provider smoke / benchmark not run; not provider-related and may use external configured services
- no tag, release, deploy, branch deletion, or PR merge
- no full remote branch merge; stale state docs intentionally not imported

## Current Blockers

- none for local validation
- current workspace_id review-plan docs batch is pending docs validation before any guarded local commit

## Remaining Risks

- Future push remains separately authorized only.
- Any true `workspace_id` backfill remains blocked until a reviewed mapping proposal and explicit data-write approval exist.
- This batch intentionally leaves remote stale docs behind; if later merging that branch, exclude those files again.

## Next Safe Action

Run docs-only validation, inspect diff, then create a guarded local commit only if the diff stays scoped and clean. Future push and any real data backfill are not authorized by default.
