# Maintenance Backlog

更新时间：2026-05-13

这份文档承接 `Phase E` 收官之后的后续增量工作。

`Phase E` 已完成：[PHASE_E_FINAL_CLOSEOUT.md](/A:/codex-memory/PHASE_E_FINAL_CLOSEOUT.md)

维护期的目标不是继续证明默认主链能不能用，而是让已经可用的 `codex-memory` 作为 `Codex` / `Claude` 的本地记忆主线长期保持：

- 可守门
- 可回滚
- 可诊断
- 可继续贴近 donor 手感
- 可为 provider/profile 变更留下可追溯证据

## 工作原则

- 默认从小的、可验证的、可回滚的增量做起。
- runtime 行为、MCP contract、active-memory suite、compare / rollback harness 改动必须配对应验证。
- 真实 provider 调用、profile confirm、清理 apply、远端 push 仍需要明确授权。
- 不再把 donor/provider/docs 边角精修记成 Phase E 未完成项。

## 当前基线

- 当前 `main`：S-008 governance output sample / troubleshooting docs batch 已验证完成
- PR #2：已按 superseded 关闭，未合并；远端分支 `codex/p1-vcp-memory-core-100-roadmap` 保留用于追溯
- gate:ci：compare `43/43`、rollback `43/43`、query assertions `8/8`、CI-safe tests `171/171`（fixture-only）；gate:mainline：health `200`、compare `43/43`、rollback `43/43`
- 标准 suite：`43/43 matched (0/0)`、npm test：`184/184`、`scope:acceptance`：`ok`
- profile health：`ready`（vectors=205，embedding cache=822，legacy=0）
- 维护期验收：[maintenance-acceptance-2026-05-08.md](/A:/codex-memory/logs/maintenance-acceptance-2026-05-08.md)
- 全部 Phase A-J + 维护期 M-001~M-013 + 8-task batch 已完成
- Verifier rail：已完成并进入 mainline 历史；包含 Worker task contract、read-only Verifier protocol、file locks、risk register 与一次 Commander -> Worker -> Verifier 试跑

## 维护期队列（首批 M-001~M-013 已全部完成）

| ID | Area | Risk | Status | Task | Validation | Notes |
|---|---|---|---|---|---|---|
| M-001 | donor-compatibility | A1 | done | 继续补高价值 `DeepMemo / TopicMemo` 标准 suite case | targeted compare / rollback；必要时 `npm run gate:mainline` | 已新增 `deepmemo-missing-keyword` 和 `topicmemo-missing-topic-id`；suite 39→41 |
| M-002 | donor-compatibility | A1 | done | donor 别名字段边角 polish | compare / rollback / `npm run gate:mainline` | `normalizeScalarForDiff` 空字符串归一化消除 6 个 extended-only-drift；compare 0/0 核心/扩展漂移 |
| M-003 | donor-compatibility | A1 | done | 排序和错误语义边角继续回归化 | category compare / rollback；`npm test` | 新增 `topicmemo-missing-maid-listtopics` 和 `topicmemo-missing-maid-gettopiccontent`；suite 41→43 |
| M-004 | provider-profile | A0/A2 | done | 真实 provider benchmark 报告留档 | `provider-benchmark` 已跑；local + bge-m3-local 均 100% recall；nvidia 500 不可达 | [报告](/A:/codex-memory/benchmarks/reports/provider-benchmark-2026-05-08.md) + [JSON](/A:/codex-memory/benchmarks/reports/provider-benchmark-2026-05-08.json) |
| M-005 | provider-profile | A1 | done | profile migration 证据沉淀 | profile-health / rebuild-profile --dry-run / profile-gate；confirm 需显式授权 | 只读证据已沉淀：[phase-e-profile-migration-evidence-01.md](/A:/codex-memory/logs/phase-e-profile-migration-evidence-01.md)；0 legacy chunks，无需迁移 |
| M-006 | docs-governance | A0 | done | 文档入口继续压缩，减少重复 checkpoint 噪音 | `git diff --check` / link check | 已在 `39cf948` 等批次压缩 README / PHASE_NAVIGATION / STATUS 的重复记录入口；已推送 |
| M-007 | docs-governance | A0 | done | `.agent_board` board-only 记录按批次聚合 | diff inspection | 已在 `6071779` 等批次聚合 board-only 验证 ledger；不创建 checkpoint-20 |
| M-008 | next-phase | A1 | done | 准备 Phase F / Codex-Claude memory governance / client scope 的候选计划 | docs review / no runtime change | 已压缩为 [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)；已推送 |
| M-009 | claude-client | A1 | done | Claude MCP 接入最小验收 | HTTP health / `claude mcp get/list` / direct MCP `memory_overview` / `deepseek-ai/deepseek-v4-flash` model-mediated `memory_overview` / `gate:mainline` | config 已写入且 MCP connected；当前模型侧调用使用 `deepseek-ai/deepseek-v4-flash` 并已成功；仅交互式 `/mcp` 面板可后补 |
| M-010 | docs-governance | A0 | done | 建立文档事实源分工规则 | `git diff --check` / link check / `npm run gate:mainline` | 新增 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)；已推送 |
| M-011 | ci-gate | A1 | done | 设计 `gate:ci` fixture-only 边界 | docs review / no runtime change / `npm run gate:mainline` | 设计入口：[GATE_CI_FIXTURE_ONLY_DESIGN.md](/A:/codex-memory/GATE_CI_FIXTURE_ONLY_DESIGN.md)；当前 `gate:ci` 已由 `G-001` 落地实现，M-011 保留为设计记录 |
| M-012 | memory-governance | A1 | done | 起草 memory governance model | docs review / no runtime change | 已创建 [MEMORY_GOVERNANCE_MODEL.md](/A:/codex-memory/MEMORY_GOVERNANCE_MODEL.md)；定义治理分层、角色、lifecycle、scope、proposal、enforcement 模型 |
| M-013 | client-scope | A1 | done | 起草 Codex / Claude client scope model | docs review / no runtime change | 已创建 [CLIENT_SCOPE_MODEL.md](/A:/codex-memory/CLIENT_SCOPE_MODEL.md)；定义 client_id、workspace_id、project_id、task_id、conversation_id、visibility、retention_policy 维度 |
| H-002a | memory-governance | A0 | done | 设计 proposal / tombstone / supersession schema | docs review | 已创建 [PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md](/A:/codex-memory/docs/PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md) |
| H-002b | memory-governance | A1 | done | migration dry-run / fixture 验证计划 | docs + dry-run | dry-run 成功：7 列 + 3 索引 + 428 records 回填；计划见 [MIGRATION_DRY_RUN_PLAN.md](/A:/codex-memory/docs/MIGRATION_DRY_RUN_PLAN.md) |
| H-002c | memory-governance | A2 | done | 真实 SQLite schema migration（含 I-002a 列） | gate:mainline + npm test | 14 列 + 6 索引迁移完成；442 records 回填；备份在 `codex-memory-pre-migration.sqlite` |
| I-002a | client-scope | A0 | done | 设计 scope schema extension | docs review | 已创建 [SCOPE_SCHEMA_EXTENSION.md](/A:/codex-memory/docs/SCOPE_SCHEMA_EXTENSION.md)；14 新列合并 migration 方案 |
| I-002c | client-scope | A2 | done | 真实 scope migration（已含入 H-002c） | gate:mainline + npm test | 与 H-002c 合并执行 |
| J-001 | observability | A0 | done | 设计 memory dashboard report shape | docs review | 已创建 [MEMORY_DASHBOARD_REPORT_DESIGN.md](/A:/codex-memory/docs/MEMORY_DASHBOARD_REPORT_DESIGN.md) |
| J-002 | observability | A1 | done | 实现 memory dashboard CLI | `npm run dashboard` / `npm run dashboard -- --json` + `npm run gate:mainline` | 已实现 `src/cli/dashboard.js`；gate 43/43 通过 |
| J-003 | observability | A0 | done | 评估 local-only Web UI | docs review | 已创建 [LOCAL_WEB_UI_ASSESSMENT.md](/A:/codex-memory/docs/LOCAL_WEB_UI_ASSESSMENT.md)；结论：当前不建议实现 |
| G-001 | ci-gate | A1 | done | 实现 gate:ci fixture-only CLI | `npm run gate:ci` | 已实现 `src/cli/gate-ci.js`；compare 43/43 + rollback 43/43 + query assertions 8/8 + tests 171/171 + docs check |
| G-002 | docs-governance | A0 | done | 补齐 Verifier rail 与多 Worker 基础治理轨道 | `git diff --check` / `scripts/validate-local.ps1 -Area docs` / Worker 试跑 / read-only Verifier | 已完成并进入 mainline 历史；后续状态以 `.agent_board` 与当前 `main` 为准 |
| S-001 | client-scope | A0 | done | 建立 `workspace_id` 回填人工审查计划 | `scope:backfill:dry-run` baseline / docs validation | 已创建 [WORKSPACE_ID_BACKFILL_REVIEW_PLAN.md](/A:/codex-memory/docs/WORKSPACE_ID_BACKFILL_REVIEW_PLAN.md)；当前 `450` records 中 `442` 缺少 `workspace_id`，`mutated=false`，不自动写真实 DB |
| S-002 | query-quality | A1 | done | 将 `real-query-suite` 从 placeholder-only 升级到 fixture-only baseline | `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js`; `npm run real-query-suite -- --json`; `npm run query:quality -- --json --dry-run`; `npm test`; `git diff --check` | 默认 suite 现在 `caseCount=5`、`placeholderCount=0`、`fixtureOnlyCount=5`、`realCount=5`；只用 `benchmarks/default-dataset.json`，无 provider 调用、无数据写入 |
| S-003 | query-quality | A1 | done | 增加 fixture assertion runner，真实校验 `mustContain` / `mustNotContain` | `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js`; `npm run real-query-suite -- --json`; `npm run query:quality -- --json --dry-run`; `npm test` | 默认 suite 现在 `assertedCount=5`、`passedCount=5`、`failedCount=0`；坏 fixture 会退出非零并输出 `assertionFailures`；无 provider 调用、无数据写入 |
| S-004 | query-quality | A1 | done | 补齐 q5/q6/q7 fixture cases，覆盖默认 dataset 全部 query | `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js`; `npm run real-query-suite -- --json`; `npm run query:quality -- --json --dry-run`; `npm test`; `git diff --check` | 默认 suite 现在 `caseCount=8`、`fixtureOnlyCount=8`、`realCount=8`、`assertedCount=8`、`passedCount=8`、`failedCount=0`；无 provider 调用、无数据写入 |
| S-005 | query-quality | A1 | done | 将 query assertion runner 接入 `gate:ci` fixture-only 门禁 | `node --test tests\gate-ci-cli.test.js`; `npm run gate:ci -- --json`; `npm test`; `git diff --check` | `gate:ci` JSON 现在包含 `checks.queries.detail.caseCount/assertedCount/failedCount`；当前 query assertions `8/8`；无 provider 调用、无数据写入 |
| S-006 | ci-gate | A1 | done | 补 `gate:ci` JSON schema 说明并加 schema snapshot 测试 | `node --test tests\gate-ci-cli.test.js`; `npm run gate:ci -- --json`; `npm test`; `git diff --check` | README / VALIDATION 现在记录 `gate:ci` fixture-only JSON 关键字段；测试锁住 summary/checks/queries.detail 字段集合 |
| S-007 | memory-governance | A1 | done | 做 `governance:report` 最小只读闭环 | `node --test tests\governance-report-cli.test.js`; `npm run governance:report -- --json`; `npm test`; `git diff --check` | `governance:report` JSON 现在带 `review.status/reviewLevel/counts/hints`；测试锁住 proposal/tombstone/supersession/stale metrics 和 review surface；无生命周期写入、无 provider 调用 |
| S-008 | memory-governance | A0 | done | 补 `governance:report` 输出样例与 troubleshooting note | `git diff --check`; docs review; `scripts/validate-local.ps1 -Area docs` | README / VALIDATION 现在给出最小 `review` JSON shape，并明确 unavailable/proposal/stale/tombstone/supersession 的只读处理建议 |

## 推荐执行顺序

1. `G-002` 已完成：治理轨道已补齐，后续多 Worker 任务可以复用 Verifier rail。
2. `P1` 已完成：`real-query-suite` 现在会在脱敏 fixture 上真实验收 `mustContain / mustNotContain`。
3. `P2` 已完成：query assertion runner 已接入 `gate:ci`，`caseCount/assertedCount/failedCount` 已成为常态门禁输出。
4. `P3` 已完成：`gate:ci` JSON schema 已写入 README/VALIDATION，并用 schema snapshot 测试锁住。
5. `P4` 已完成：`governance:report` 现在输出只读 `review` surface，覆盖 proposal/tombstone/supersession/stale metrics。
6. `P5` 已完成：README / VALIDATION 已补 `governance:report` 输出样例和 troubleshooting note。
7. `P6`：如果继续本线，可补 dashboard/http-observe 的更细 schema snapshot；若没有明确需求，先不扩大。
8. provider/profile 相关动作继续保持按需触发，除非用户明确要求，不主动跑真实 provider 命令。

## 授权边界

可自动推进：

- 文档索引、导航、handoff、board note
- 小型 suite case 的本地准备
- 只读 compare / rollback / gate
- dry-run 型 profile 检查
- Claude MCP 只读预检和验收文档更新

需要明确授权：

- `git push origin main`
- `claude mcp add` / `claude mcp remove` 等会写入 Claude 配置的命令
- 真实远端 `provider-smoke`
- 真实远端 `provider-benchmark`
- `rebuild-profile -- --confirm`
- cleanup 非 dry-run / apply / confirm
- 修改 `.env`、secret、provider key
- 迁移真实数据或 broad export/import

## 退出条件

维护期任务完成时，不需要再回写 Phase E backlog。只需要：

- 更新本文件对应任务状态或补一条新任务
- 更新 `.agent_board`
- 跑对应验证
- 按聚合节奏提交

## 一句话

Phase E 已经收口；维护期从这里开始，后续只接小而可证的增量。
