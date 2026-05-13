# CHECKPOINT.md — codex-memory

## Current Goal

P10-roadmap-source-registration：建立 VCP memory practical parity 100% 长期路线图事实源。

## Current Area

roadmap / docs-governance

## Current Status

本轮是 A0 docs-only 路线图写入：新增 `docs/VCP_MEMORY_PARITY_ROADMAP.md` 作为 P10-P23 长期路线图事实源。README / NEXT_PHASE / BACKLOG 只保留链接或摘要，避免复制全文造成漂移。不改 runtime，不改 tests，不改 package.json，不改 `.env`，不调用 provider，不 push。

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
- 补齐 q5/q6/q7 对应的 `rerank_providers` / `embedding_providers` / `diary_vectors` fixture cases，并把 provider smoke case 对齐为 `rq-008`。
- 新增默认 suite 覆盖全部默认 dataset queries 的回归测试，避免后续漏 case。
- `gate:ci` 新增 `queries` check，复用 `real-query-suite-core` 的 `runSuiteReport(DEFAULT_SUITE)`。
- `gate:ci` JSON 输出现在包含 `checks.queries.detail.caseCount/assertedCount/passedCount/failedCount`。
- `gate:ci` 文本输出现在包含 `queries` 行和 `8/8 query assertions passed`。
- README 新增 `CI Fixture-Only Gate` 小节，记录 `gate:ci` / `gate:ci -- --json` 用法和 JSON 关键字段。
- VALIDATION 新增 `Fixture-Only CI Gate` contract 小节，明确 fixture-only 边界与常态报告字段。
- `tests/gate-ci-cli.test.js` 增加 schema snapshot 风格断言，锁住 `summary` / `checks` / `queries.detail` 字段集合。
- `governance:report` JSON 新增 `review` surface，包含 `status`、`reviewLevel`、`counts`、`statusDistribution`、`retention`、`hints`。
- `governance:report` 文本输出新增 `Review:` 小节，直接展示 review level 和 hints。
- `tests/governance-report-cli.test.js` 锁住 JSON top-level / review key set，并校验 proposal/tombstone/supersession/stale count。
- README / VALIDATION 补充 governance report 只读 review surface 说明。
- README / VALIDATION 补充最小 `review` JSON 输出样例。
- README / VALIDATION 补充 governance troubleshooting note，明确 unavailable/proposal/stale/tombstone/supersession 的只读处理方式。
- `tests/dashboard-cli.test.js` 增加 top-level、summary、governance、governance counts、audits/recall 的 key-set snapshot。
- `tests/http-observe-cli.test.js` 增加 top-level、summary、health、config、logs、audits/write、audits/recall、governance 的 key-set snapshot。
- README 新增 dashboard/observe schema contract 摘要，明确 `summary` / `governance` / `audits` / `scope` / `logs` 只读边界。
- VALIDATION 新增 `Dashboard / Observe Schema Contract` 小节，记录对应命令、只读限制、字段边界和 snapshot test 维护要求。
- STATUS / MAINTENANCE_BACKLOG / `.agent_board` 已推进到 S-010。
- 新增 `SecretScanner`，在 `MemoryWriteService` 写 diary 前扫描 `title/content/evidence/tags`，命中 secret-like 内容直接拒绝。
- 新增 `ToolArgumentValidator`，在 MCP `tools/call` 入口拒绝 unknown field、enum mismatch 和 invalid scope，返回 `-32602`。
- HTTP MCP 对 non-loopback host + empty token fail-fast；loopback no-token 仍可本地开发，并通过 health/log warning 显式提示。
- 新增 `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false` 默认关闭；开启后过滤 proposal/rejected/tombstoned 和 cross-client private。
- `real-query-suite` / `query:quality` 支持 `--fixture-recall-dry-run`，只读 fixture，不触碰 durable memory，不调用 provider。
- Roadmap source registration 新增 `docs/VCP_MEMORY_PARITY_ROADMAP.md`，完整记录 current、target、strategy、P10-P23、禁止提前跳 P16/P17/V8/UI/release。
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md` 只新增路线图事实源链接、近期优先级 P10 -> P11 -> P12、禁止提前跳转摘要。
- `MAINTENANCE_BACKLOG.md` 只登记 `P10-roadmap-source-registration`、`P10.1-runtime-gate-docs-ci-policy-preflight`、`P11-memory-lifecycle-core-planning`，没有展开 P10-P23 全队列。
- README 只新增 VCP memory parity roadmap 入口链接。
- `.agent_board` 已同步当前 next phase：`P10.1` 或 `P11` 前置规划，不实现 runtime，不 push。

## Changed Files

- `benchmarks/real-query-suite/v1.json`
- `src/cli/real-query-suite-core.js`
- `src/cli/query-quality-report.js`
- `src/cli/real-query-suite.js`
- `src/cli/gate-ci.js`
- `tests/gate-ci-cli.test.js`
- `README.md`
- `VALIDATION.md`
- `src/cli/governance-report.js`
- `tests/governance-report-cli.test.js`
- `README.md`
- `VALIDATION.md`
- `tests/dashboard-cli.test.js`
- `tests/http-observe-cli.test.js`
- `README.md`
- `VALIDATION.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`
- `src/core/SecretScanner.js`
- `src/core/ToolArgumentValidator.js`
- `src/core/MemoryWriteService.js`
- `src/adapters/codex-mcp/server.js`
- `src/adapters/codex-mcp/http.js`
- `src/http-index.js`
- `src/config/createConfig.js`
- `src/app.js`
- `src/storage/SqliteShadowStore.js`
- `src/cli/real-query-suite-core.js`
- `src/cli/real-query-suite.js`
- `src/cli/query-quality-report.js`
- `tests/security-write-policy.test.js`
- `tests/mcp-contract.test.js`
- `tests/mcp-http.test.js`
- `tests/policy-read-preflight.test.js`
- `tests/real-query-suite.test.js`
- `tests/query-quality-report.test.js`
- `docs/VCP_MEMORY_PARITY_ROADMAP.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `tests/query-quality-report.test.js`
- `tests/real-query-suite.test.js`
- `GATE_CI_FIXTURE_ONLY_DESIGN.md`
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
- `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 14/14 passed
- `npm run real-query-suite -- --json` -> ok; 8 valid, 0 placeholder, 8 fixture-only, 8 real, 8 asserted, 8 passed, 0 failed
- `npm run query:quality -- --json --dry-run` -> ok; 8 runnable, 0 placeholder, 8 fixture-only, 8 real, 8 asserted, 8 passed, 0 failed, `mutated=false`
- `npm test` -> 184/184 passed
- `node --test tests\gate-ci-cli.test.js` -> 2/2 passed
- `npm run gate:ci -- --json` -> ok; compare 43/43, rollback 43/43, query assertions 8/8, CI-safe tests 171/171, docs check ok
- `npm test` -> 184/184 passed
- `node --test tests\gate-ci-cli.test.js` -> 2/2 passed with schema snapshot assertions
- `npm run gate:ci -- --json` -> ok; compare 43/43, rollback 43/43, query assertions 8/8, CI-safe tests 171/171, docs check ok
- `git diff --check` -> passed
- `node --test tests\governance-report-cli.test.js` -> 3/3 passed
- `npm run governance:report -- --json` -> ok; read-only report generated; local current review `status=ok`, `reviewLevel=nominal`
- `node --test tests\dashboard-cli.test.js tests\http-observe-cli.test.js tests\governance-report-cli.test.js` -> 9/9 passed
- `npm test` -> 184/184 passed
- `npm run gate:ci -- --json` -> ok; compare 43/43, rollback 43/43, query assertions 8/8, CI-safe tests 171/171, docs check ok
- `git diff --check` -> passed
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` -> passed
- `node --test tests\dashboard-cli.test.js tests\http-observe-cli.test.js` -> 6/6 passed
- `git diff --check` -> passed
- `npm test` -> 184/184 passed
- `npm run gate:ci -- --json` -> ok; compare 43/43, rollback 43/43, query assertions 8/8, CI-safe tests 171/171, docs check ok
- final status/diff scope review -> completed
- new-file trailing whitespace and high-risk token scans -> clean
- S-010 `git diff --check` -> passed
- S-010 `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` -> passed
- P10 `node --test tests\security-write-policy.test.js` -> 2/2 passed
- P10 `node --test tests\mcp-contract.test.js` -> 7/7 passed
- P10 `node --test tests\mcp-http.test.js` -> 5/5 passed
- P10 `node --test tests\policy-read-preflight.test.js` -> 4/4 passed
- P10 `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js` -> 16/16 passed
- P10 `npm test` -> 195/195 passed
- P10 `npm run gate:mainline:strict` -> passed; health ok, contract 12/12, test 195/195, compare 43/43, rollback 43/43
- P10 `npm run scope:acceptance -- --json` -> status `ok`
- P10 `git diff --check` -> passed
- Roadmap source registration `git diff --check` -> passed
- Roadmap source registration `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` -> passed

## Validation Not Run

- provider smoke / benchmark not run; this batch is fixture-only and must not call providers
- no tag, release, deploy, branch deletion, or PR merge
- no full remote branch merge; stale state docs intentionally not imported
- no provider/DB/production write authorized
- no `.env` / secret file edits
- no dependency changes
- no public MCP tool expansion

## Current Blockers

- none for local validation; push remains forbidden without explicit authorization

## Remaining Risks

- Future push remains separately authorized only.
- Any true `workspace_id` backfill remains blocked until a reviewed mapping proposal and explicit data-write approval exist.
- Soft read policy is intentionally default-off; enabling it in a real client is a behavior change and should be separately staged.
- Secret scanning is pattern-based and conservative; future tuning may need allowlist/denylist review if false positives appear.
- Fixture recall dry-run is not provider quality scoring; true provider/retrieval quality remains separate and must not be implied.

## Next Safe Action

Create guarded local docs commit, then stop without push. Recommended next task remains `P10.1-runtime-gate-docs-ci-policy-preflight`, followed by `P11-memory-lifecycle-core-planning`.
