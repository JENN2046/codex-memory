# CHECKPOINT.md — codex-memory

## Current Goal

P9 — 安排远端 `origin/codex/p1-vcp-memory-core-100-roadmap` 的可用实现：只集成 runtime / CLI / storage / recall / tests 中可验证的 scope/runtime/query 变更，避开陈旧状态文档和远端 `.agent_board`。

## Current Area

P9-codex-claude-client-scope

## Current Status

本地集成批次已完成实现、修复、验证，并提交为 `e1883e6 feat: integrate scoped memory runtime tools`。策略是 selective integration：不整支合并远端分支，不带入陈旧 `README` / `STATUS` / `PHASE_NAVIGATION` / `MAINTENANCE_BACKLOG` / 远端 `.agent_board`，只保留已验证的代码、测试、CLI、benchmark fixture 和 narrow docs。

## Completed Work

- 从远端分支选择性恢复 package scripts、scope/query CLIs、runtime scope plumbing、storage/recall changes、query benchmark fixture 和相关 tests。
- 本地修复 `src/core/constants.js`：恢复 `client_id` / `visibility` schema enum 约束，避免 MCP contract 放宽。
- 本地修复 `src/cli/scope-backfill-dry-run.js`：`wouldUpdate` 现在覆盖仅缺 `workspace_id` 的记录，并把 `workspace_id` 标为 manual review required。
- 本地修复 `src/cli/scope-acceptance.js`：acceptance 现在覆盖 `project_id` / `workspace_id` / `client_id` / `visibility` 四维 strict isolation，并按 memory id 做 leak 检查。
- 本地修复 `src/core/MemoryWriteService.js`：保留 snake_case scope 字段，同时兼容现有 camelCase 内部调用。
- 扩展 MCP contract、scope backfill、scope acceptance 相关回归测试。
- 更新 `docs/scope-backfill-policy.md`，明确 `workspace_id` 不能自动猜测，需要人工审核。
- 创建本地提交 `e1883e6 feat: integrate scoped memory runtime tools`；未 push。

## Changed Files

- `package.json`
- `benchmarks/real-query-suite/v1.json`
- `docs/scope-backfill-policy.md`
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
- final status/diff scope review -> completed
- new-file trailing whitespace and high-risk token scans -> clean

## Validation Not Run

- provider smoke / benchmark not run; not provider-related and may use external configured services
- no push, PR, tag, release, deploy, or remote write
- no full remote branch merge; stale state docs intentionally not imported

## Current Blockers

- none for local validation
- commit/push remains a hard-stop decision requiring explicit approval

## Remaining Risks

- Push remains unauthorized.
- This batch intentionally leaves remote stale docs behind; if later merging that branch, exclude those files again.

## Next Safe Action

Await explicit instruction if push or further local work is desired. Push is not authorized.
