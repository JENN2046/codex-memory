# CHECKPOINT.md — codex-memory

## Current Goal

P7 — 将 `real-query-suite` 从 placeholder-only 样本推进到脱敏 fixture-only baseline，并保留无 provider / 无真实数据写入边界。

## Current Area

P7-vcp-parity-hardening

## Current Status

远端 `main` 当前同步到 `76b1513 docs: plan workspace scope backfill review`。本轮在本地把 `real-query-suite` 的 5 条 placeholder case 替换为基于 `benchmarks/default-dataset.json` 的脱敏 fixture-only case，并扩展 query CLI 报告 `fixtureOnlyCount` / `realCount`。当前不调用 provider，不读取/写入真实 memory DB。

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
- 将 `benchmarks/real-query-suite/v1.json` 替换为 5 条 fixture-only case，全部来源于 `benchmarks/default-dataset.json`。
- 扩展 `real-query-suite` / `query:quality` CLI 输出 `fixtureOnlyCount` 和 `realCount`。
- 测试锁住默认 suite：`placeholderCount=0`、`fixtureOnlyCount=5`、`realCount=5`，且每条 case 的 `mustContain` 非空。

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
- `tests/query-quality-report.test.js`
- `tests/real-query-suite.test.js`
- `.agent_board/*`

## Validation Run

- `git diff --check` -> passed
- `node --test tests\mcp-contract.test.js tests\scope-filter.test.js tests\scope-acceptance-cli.test.js tests\scope-backfill-dry-run.test.js tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 44/44 passed
- `npm test` -> 181/181 passed
- `npm run gate:mainline:strict` -> ok; health `200`; contract 7/7; test 180/180; compare 43/43 matched; rollback 43/43 rollback-ready
- `npm run scope:acceptance -- --json` -> ok; full scope dimensions present; Project A/B found; no cross-scope leak
- `npm run scope:backfill:dry-run -- --json` -> ok; `450` total, `442` missing `workspace_id`, `mutated=false`
- `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 11/11 passed
- `npm run query:quality -- --json --dry-run` -> ok; 5 runnable, 0 placeholder, 5 fixture-only, 5 real, `mutated=false`
- `npm run real-query-suite -- --json` -> ok; 5 valid, 0 placeholder, 5 fixture-only, 5 real
- final status/diff scope review -> completed
- new-file trailing whitespace and high-risk token scans -> clean

## Validation Not Run

- provider smoke / benchmark not run; this batch is fixture-only and must not call providers
- no tag, release, deploy, branch deletion, or PR merge
- no full remote branch merge; stale state docs intentionally not imported

## Current Blockers

- none for local validation
- none for local validation

## Remaining Risks

- Future push remains separately authorized only.
- Any true `workspace_id` backfill remains blocked until a reviewed mapping proposal and explicit data-write approval exist.
- This batch intentionally leaves remote stale docs behind; if later merging that branch, exclude those files again.
- The current query suite still validates metadata/counts only; actual `mustContain` / `mustNotContain` assertion execution is the next safe improvement.

## Next Safe Action

Create a guarded local commit if final diff remains scoped and clean. Next safe implementation task is adding a fixture assertion runner for `mustContain` / `mustNotContain`; future push remains separately authorized.
