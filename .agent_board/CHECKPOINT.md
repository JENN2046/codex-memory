# CHECKPOINT.md — codex-memory

## Current Goal

P7 — 将 `real-query-suite` 从 fixture-only baseline 推进到真实 fixture assertion baseline，并保留无 provider / 无真实数据写入边界。

## Current Area

P7-vcp-parity-hardening

## Current Status

远端 `main` 当前同步到 `055d749 docs: clean query suite handoff state`。本轮在本地实现共享 fixture assertion runner，让 `real-query-suite` 和 `query:quality` 基于 `benchmarks/default-dataset.json` 真实校验 `expected.mustContain` / `expected.mustNotContain`。当前默认 suite 为 5 条脱敏 fixture-only case，`assertedCount=5`、`passedCount=5`、`failedCount=0`。本地提交已创建为 `d06a3ca feat: assert real query fixture expectations`，尚未 push。当前不调用 provider，不读取/写入真实 memory DB。

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
- 创建本地 guarded commit `c425764 feat: replace real query placeholders with fixtures`。
- 复审后修正 `.agent_board` 的 stale handoff：不再提示重复创建 query-suite commit。
- 新增 `src/cli/real-query-suite-core.js`，集中处理 suite 参数解析、fixture 加载、case 校验、fixture assertion 和报告生成。
- `real-query-suite` / `query:quality` 复用同一只读 runner，输出 `assertedCount` / `passedCount` / `failedCount`，fixture drift 时以 `status=failed` 非零退出。
- 补充坏 fixture 回归测试，确认缺失 `mustContain` 和命中 `mustNotContain` 都会进入 `assertionFailures`。
- 创建本地 guarded commit `d06a3ca feat: assert real query fixture expectations`。

## Changed Files

- `benchmarks/real-query-suite/v1.json`
- `src/cli/real-query-suite-core.js`
- `src/cli/query-quality-report.js`
- `src/cli/real-query-suite.js`
- `tests/query-quality-report.test.js`
- `tests/real-query-suite.test.js`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Validation Run

- `git diff --check` -> passed
- `node --test tests\mcp-contract.test.js tests\scope-filter.test.js tests\scope-acceptance-cli.test.js tests\scope-backfill-dry-run.test.js tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 44/44 passed
- previous fixture-only baseline `npm test` -> 181/181 passed
- prior `npm run gate:mainline:strict` baseline -> ok; health `200`; contract 7/7; test 180/180; compare 43/43 matched; rollback 43/43 rollback-ready
- `npm run scope:acceptance -- --json` -> ok; full scope dimensions present; Project A/B found; no cross-scope leak
- `npm run scope:backfill:dry-run -- --json` -> ok; `450` total, `442` missing `workspace_id`, `mutated=false`
- previous fixture-only query tests -> 11/11 passed
- `npm run query:quality -- --json --dry-run` -> ok; 5 runnable, 0 placeholder, 5 fixture-only, 5 real, `mutated=false`
- `npm run real-query-suite -- --json` -> ok; 5 valid, 0 placeholder, 5 fixture-only, 5 real
- post-commit read-only review -> completed; only stale board/handoff wording found and fixed in this board-only cleanup
- `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 13/13 passed
- `npm run real-query-suite -- --json` -> ok; 5 valid, 0 placeholder, 5 fixture-only, 5 real, 5 asserted, 5 passed, 0 failed
- `npm run query:quality -- --json --dry-run` -> ok; 5 runnable, 0 placeholder, 5 fixture-only, 5 real, 5 asserted, 5 passed, 0 failed, `mutated=false`
- `npm test` -> 183/183 passed
- final status/diff scope review -> completed
- new-file trailing whitespace and high-risk token scans -> clean

## Validation Not Run

- provider smoke / benchmark not run; this batch is fixture-only and must not call providers
- no tag, release, deploy, branch deletion, or PR merge
- no full remote branch merge; stale state docs intentionally not imported
- no push after local assertion-runner work; remote write still requires explicit approval

## Current Blockers

- none for local validation

## Remaining Risks

- Future push remains separately authorized only.
- Any true `workspace_id` backfill remains blocked until a reviewed mapping proposal and explicit data-write approval exist.
- This batch intentionally leaves remote stale docs behind; if later merging that branch, exclude those files again.
- The current query suite still uses 5 of 8 default dataset queries; remaining fixture expansion can be done as the next local improvement.

## Next Safe Action

Wait for explicit authorization before pushing `d06a3ca`. Next safe local implementation task is expanding fixture assertions to the remaining default dataset queries or wiring this runner into a broader fixture-only gate.
