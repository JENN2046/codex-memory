# Maintenance Backlog

更新时间：2026-05-14

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

- 当前 `main`：P10 memory policy runtime gate、roadmap source registration、P10.1 runtime gate docs / `gate:ci` policy preflight、P11 memory lifecycle core planning、P11.1 lifecycle fixture schema tests、P11.2 lifecycle SQLite dry-run planning、P11.3 lifecycle SQLite dry-run CLI fixture tests、P11.4 / P11.5 / P11.6 / P11.7、P11.x stale branch quarantine、P11.8 lifecycle read-policy runtime flag implementation、P11.9 lifecycle policy gate-ci summary、P11.10 lifecycle read-policy observability/dashboard summary、P12 planning、P12.1 controlled write fixture schemas、P12.2 mutation audit shape tests、P12.3 controlled write dry-run CLI prototypes、P12.4 MCP tool proposal review、A4.8 Safe Project Operator Rail、P12.5 runtime approval gate / fixture tests / internal service / plan / review、P12.6 internal validate_memory CLI 均已进入 `origin/main`
- 长期路线图事实源：[docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)
- PR #2：已按 superseded 关闭，未合并；远端分支 `codex/p1-vcp-memory-core-100-roadmap` 保留用于追溯。Stale branch quarantine 记录：[docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md](/A:/codex-memory/docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md)。该分支不可整体 merge、不可 rebase、不可作为开发基线，只允许选择性文档 salvage。
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
| S-009 | observability-admin | A1 | done | 补 dashboard/http-observe 更细 schema snapshot | `node --test tests\dashboard-cli.test.js tests\http-observe-cli.test.js`; `npm test`; `npm run gate:ci -- --json`; `git diff --check` | dashboard/http-observe tests 现在锁住 top-level、summary、governance、audit/scope/logs 等关键 JSON 字段集合 |
| S-010 | observability-admin | A0 | done | 补 dashboard/http-observe schema contract 摘要 | `git diff --check`; `scripts/validate-local.ps1 -Area docs` | README / VALIDATION 现在说明 `summary`、`governance`、`audits`、`scope`、`logs` 字段边界；只读观测不授权 backfill、migration、lifecycle write 或 MCP contract 扩展 |
| P10-1 | memory-policy-hardening | A2 | done | 写入前 secret scanner | `node --test tests\security-write-policy.test.js`; `npm test`; `npm run gate:mainline:strict` | `MemoryWriteService` 写 diary 前扫描 title/content/evidence/tags；命中 secret-like 内容拒绝，audit 不记录原始 secret |
| P10-2 | memory-policy-hardening | A2 | done | MCP `tools/call` runtime schema validation | `node --test tests\mcp-contract.test.js`; `npm test`; `npm run gate:mainline:strict` | unknown field / enum mismatch / invalid scope 返回 `-32602`；`TOOL_DEFINITIONS` 未放宽，public tools 仍为 3 个 |
| P10-3 | memory-policy-hardening | A2 | done | HTTP auth hardening | `node --test tests\mcp-http.test.js`; `npm test`; `npm run gate:mainline:strict` | non-loopback host + empty token fail-fast；loopback no-token 保持可开发并在 health/log warning 中显式提示 |
| P10-4 | memory-policy-hardening | A3 | done | soft read policy feature flag | `node --test tests\policy-read-preflight.test.js`; `npm test`; `npm run gate:mainline:strict` | `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` 默认 false；开启后过滤 proposal/rejected/tombstoned 与 cross-client private；默认行为保持不变 |
| P10-5 | memory-policy-hardening | A2 | done | query suite fixture recall dry-run | `node --test tests\real-query-suite.test.js tests\query-quality-report.test.js`; `npm test`; `npm run gate:mainline:strict` | `real-query-suite` / `query:quality` 支持 `--fixture-recall-dry-run`，只读 fixture，不碰 durable memory，不调用 provider |
| P10-roadmap-source-registration | roadmap | A0 | done | 建立 VCP memory practical parity 长期路线图事实源 | `git diff --check`; `scripts/validate-local.ps1 -Area docs` | 新增 `docs/VCP_MEMORY_PARITY_ROADMAP.md`；README / NEXT_PHASE / BACKLOG 只保留链接或摘要，不复制全文 |
| P10.1-runtime-gate-docs-ci-policy-preflight | memory-policy-hardening | A0/A1 | done | 补 runtime gate flags 文档，并接入 fixture-only `gate:ci` policy preflight 输出 | `node --test tests\gate-ci-cli.test.js`; `node --test tests\policy-read-preflight.test.js`; `npm run gate:ci`; `npm test`; `git diff --check`; docs validation | `checks.policyPreflight` 现在输出 fixture-only soft read policy summary；不扩大 enforcement，不调用 provider，不改变 runtime 默认行为 |
| P11-memory-lifecycle-core-planning | memory-governance | A0/A1 | done | P11 memory lifecycle core planning | `git diff --check`; `scripts/validate-local.ps1 -Area docs` | 新增 `docs/MEMORY_LIFECYCLE_CORE_PLAN.md`；已规划 lifecycle 状态、transition、audit shape、read policy relationship；不直接改 runtime |
| P11.1-lifecycle-fixture-schema-tests | memory-governance | A1 | done | Fixture schema tests for lifecycle statuses, transitions, audit shape, and read-policy expectations | `node --test tests\lifecycle-schema.test.js`; `npm test`; `git diff --check`; docs validation | 已固化 `tests/fixtures/lifecycle-policy-v1.json` 与 `tests/lifecycle-schema.test.js`；不做 SQLite migration 或真实数据迁移 |
| P11.2-sqlite-lifecycle-columns-dry-run-planning | memory-governance | A1/A2 | done | Plan lifecycle columns and dry-run report shape for SQLite shadow store | `git diff --check`; docs validation | 新增 `docs/MEMORY_LIFECYCLE_SQLITE_DRY_RUN_PLAN.md`；只规划 dry-run，不做 SQLite migration 或真实数据迁移 |
| P11.3-lifecycle-sqlite-dry-run-cli-fixture-tests | memory-governance | A2 | done | Implement fixture-only lifecycle SQLite dry-run CLI and tests | `node --test tests\lifecycle-sqlite-dry-run-cli.test.js`; `npm test`; `npm run lifecycle:sqlite:dry-run -- --json`; `git diff --check`; docs validation | CLI read-only reports lifecycle column gaps, `mutated=false`, rejects `--confirm/--apply`; no SQLite migration |
| P11.4-lifecycle-read-policy-runtime-flag-planning | memory-governance | A1/A2 | done | Plan lifecycle read-policy runtime flag, status visibility, scope relationship, and audit summary shape | `git diff --check`; docs validation | Docs/board only; no runtime/tests/package changes; no `search_memory` behavior change |
| P11.5-lifecycle-read-policy-fixture-tests | memory-governance | A1 | done | Lock lifecycle read-policy include/exclude, private visibility, and audit summary shape with fixture tests | `node --test tests\lifecycle-read-policy-fixture.test.js`; `npm test`; `git diff --check`; docs validation | Tests/fixture/docs only; no runtime behavior change |
| P11.6-lifecycle-read-policy-runtime-flag-implementation-planning | memory-governance | A1/A2 | done | Plan optional lifecycle read-policy runtime flag implementation before touching runtime | `git diff --check`; docs validation | Docs/board only; defines insertion points, missing-column behavior, audit summary, and future sequence; no runtime change |
| P11.7-lifecycle-read-policy-runtime-fixture-tests | memory-governance | A1/A2 | done | Add runtime-oriented fixture tests before implementing lifecycle read-policy runtime flag | `node --test tests\lifecycle-read-policy-runtime-fixture.test.js`; `npm test`; `git diff --check`; docs validation | Future tests only; proves default-off flags, enabled filtering, stale counts, private visibility, missing-column fail-safe, and audit summary shape before runtime implementation |
| P11.8-lifecycle-read-policy-runtime-flag-implementation | memory-governance | A2/A3 | done | Implement optional lifecycle read-policy runtime flag while preserving default-off behavior | targeted runtime tests; `npm test`; `npm run gate:ci`; `npm run gate:mainline:strict`; `git diff --check` | `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` defaults false; enabled mode filters lifecycle statuses; no MCP tool expansion and no SQLite migration |
| P11.9-lifecycle-policy-gate-ci-summary | memory-governance / ci-gate | A1/A2 | done | Add fixture-only lifecycle read-policy summary to `gate:ci` | `node --test tests\gate-ci-cli.test.js`; `node --test tests\lifecycle-read-policy-runtime-fixture.test.js`; `npm run gate:ci`; `npm run gate:ci -- --json`; `npm test`; `git diff --check`; docs validation | CI-safe summary only; no runtime behavior change, no MCP tool expansion, no SQLite migration |
| P11.10-lifecycle-read-policy-observability-dashboard-summary | observability / memory-governance | A1/A2 | done | Surface lifecycle read-policy summary in dashboard, observe:http, and governance report | `node --test tests\dashboard-cli.test.js`; `node --test tests\http-observe-cli.test.js`; `node --test tests\governance-report-cli.test.js`; dashboard/observe/governance JSON; `npm test`; `npm run gate:ci`; docs validation | Reporting only; no `search_memory` behavior change, no MCP tool expansion, no SQLite migration |
| P11.x-stale-branch-quarantine-and-doc-salvage | docs-governance | A1 | done | Quarantine `codex/p1-vcp-memory-core-100-roadmap` as superseded stale reference branch and salvage only rewritten docs | `git diff --check`; docs validation; manual stale-branch boundary review | Docs/board only; no merge/rebase/cherry-pick; no `src/`, tests, or package changes |
| P12-controlled-write-tools-planning | memory-governance | A2/A3 | done | Plan controlled write tool candidates and mutation boundaries without implementing runtime mutation | `git diff --check`; docs validation | Docs/board only; no MCP public tool expansion, no runtime mutation, no SQLite migration; entered mainline before P12.1 |
| P12.1-controlled-write-fixture-schemas | memory-governance | A1/A2 | done | Add controlled write fixture schemas before any runtime mutation | `node --test tests\controlled-write-tools-fixture.test.js`; `npm test`; `git diff --check`; docs validation | Fixture/schema phase only; no durable mutation and no MCP public tool expansion |
| P12.2-mutation-audit-shape-tests | memory-governance | A1/A2 | done | Add mutation audit event shape fixture and tests before dry-run CLI or runtime mutation | `node --test tests\mutation-audit-shape.test.js`; `npm test`; `git diff --check`; docs validation | Fixture/test/docs only; no durable mutation, no MCP public tool expansion, no SQLite migration |
| P12.3-controlled-write-dry-run-cli-prototypes | memory-governance | A2 | done | Add fixture-driven controlled write dry-run CLI prototype | `node --test tests\controlled-write-dry-run-cli.test.js`; `node --test tests\controlled-write-tools-fixture.test.js`; `node --test tests\mutation-audit-shape.test.js`; `npm run controlled-write:dry-run -- --json`; `npm test`; `git diff --check`; docs validation | Dry-run only; `audit_memory` read-only; `mutated=false`, no DB/diary/vector/audit-log/memory write, no MCP public tool expansion, no SQLite migration |
| P12.4-MCP-tool-proposal-review | memory-governance | A1/A2 | done | Review controlled write dry-run outputs and candidate tool boundaries before any public MCP tool proposal | `node --test tests\controlled-write-proposal-review.test.js`; `npm test`; `git diff --check`; docs validation | Docs/tests-design only; targeted `10/10`, full suite `280/280`; no runtime mutation, no MCP public tool expansion, no MCP schema change |
| A4.8-safe-project-operator-rail | docs-governance | A0/A1 | done | Install A4.8 governance rail, safe-push policy, validation selection, failure recovery, and board phase/closeout schemas | `git diff --check`; docs validation | Docs/board/policy only; no runtime/tests/package/MCP/schema/SQLite changes |
| P12.5-first-runtime-mutation-tool-planning-approval-gate | memory-governance | A1/A2 | done | Define the explicit approval gate for the first runtime mutation candidate before any runtime write path | `git diff --check`; docs validation | Docs/board only; `validate_memory` remains candidate only; runtime mutation, MCP expansion, SQLite migration, and real DB/memory write remain A5 hard stops |
| P12.5-validate-memory-runtime-fixture-tests | memory-governance | A1/A2 | done | Lock `validate_memory` runtime input schema, transitions, audit shape, dry-run behavior, redaction, and policy boundaries before runtime approval | `node --test tests\validate-memory-runtime-fixture.test.js`; `npm test`; `git diff --check`; docs validation | Fixture/tests/docs only; targeted `11/11`, full suite `291/291`; no runtime mutation, MCP tool/schema change, SQLite migration, or durable memory write |
| P12.5-validate-memory-internal-runtime-implementation | memory-governance | A2/A3 | done | Implement narrow internal `validate_memory` runtime service for `proposal/stale -> active` with audit, SecretScanner, ToolArgumentValidator, scope and lifecycle policy gates | targeted runtime test `9/9`; fixture test `11/11`; `npm test` `300/300`; `gate:ci` PASS; `gate:mainline:strict` PASS; lifecycle SQLite dry-run `mutated=false`; diff/docs validation | Internal service only; no MCP public tool expansion, no MCP schema change, no SQLite migration, no hard delete, no provider call |
| P12.5-validate-memory-runtime-implementation-plan | memory-governance | A0/A1 | done | Record ValidateMemoryService, SqliteShadowStore, app wiring, audit write, test matrix, and rollback story before any further runtime/MCP work | `git diff --check`; docs validation | Docs/tests-design only; no `src/`, package, MCP schema/tool, SQLite migration, hard delete, provider call, or durable memory write |
| P12.5-validate-memory-internal-runtime-review | memory-governance | A1/A2 | done | Review internal `validate_memory` runtime against fixture, approval gate, implementation plan, and targeted tests | fixture `11/11`; runtime `9/9`; MCP contract `7/7`; full suite `300/300`; `gate:ci` PASS; strict gate PASS; lifecycle dry-run `mutated=false`; diff/docs validation | Review PASS; no blocking drift, no MCP expansion, no SQLite migration, no hard delete |
| P12.6-validate-memory-internal-cli-wrapper | memory-governance | A2 | done | Add a local internal CLI wrapper for manual dry-run and explicitly confirmed `validate_memory` apply through `ValidateMemoryService` | CLI `12/12`; runtime `9/9`; fixture `11/11`; MCP contract `7/7`; full suite `312/312`; `gate:ci` PASS; strict gate PASS; lifecycle dry-run `mutated=false`; diff/docs validation | Internal CLI only; no MCP public tool expansion, no MCP schema change, no SQLite migration, no broader mutation tools |
| P13-VCP-compatible-memory-object-model-planning | memory-governance / object-model | A2/A3 | done | Plan VCP-compatible practical object model before fixtures, mapping, import/export, or migration work | `git diff --check`; docs validation | Planning only; validate_memory remains internal-only; no `src/`, tests, package, MCP schema/tool, SQLite migration, or durable memory write |
| P13.1-object-model-fixture-schemas | memory-governance / object-model | A1/A2 | done | Add fixture schemas and tests for MemoryRecord vNext and object families | `node --test tests\vcp-memory-object-model-fixture.test.js`; `npm test`; diff/docs validation | Fixture/schema only; no runtime or migration |
| P13.2-object-model-round-trip-fixture-tests | memory-governance / object-model | A1/A2 | done | Add fixture-only round-trip tests for object envelopes | `node --test tests\vcp-memory-object-round-trip.test.js`; `node --test tests\vcp-memory-object-model-fixture.test.js`; `npm test`; diff/docs validation | Fixture/test/docs only; no runtime, import/export implementation, or migration |
| P13.3-SQLite-diary-mapping-dry-run-planning | memory-governance / object-model | A1/A2 | done | Plan SQLite/diary mapping dry-run report before any mapper or migration | `git diff --check`; docs validation | Docs/board planning only; no SQLite migration, `ALTER TABLE`, import/export runtime, runtime mapper, tests, or real DB/memory write |
| P13.4-object-mapping-fixture-tests | memory-governance / object-model | A1/A2 | done | Add fixture tests for SQLite/diary object mapping preview behavior | `node --test tests\vcp-memory-object-mapping-fixture.test.js`; object model and round-trip regressions; `npm test`; diff/docs validation | Fixture/test/docs only; no real data scan, runtime mapper, import/export runtime, or migration |
| P13.5-SQLite-diary-mapping-dry-run-CLI | memory-governance / object-model | A2 | done | Add read-only SQLite/diary mapping dry-run CLI after fixture tests | `node --test tests\vcp-memory-object-mapping-dry-run-cli.test.js`; mapping and round-trip regressions; CLI JSON smoke; `npm test`; diff/docs validation | Reports `mutated=false`; fixture mode only; no SQLite write, diary rewrite, import/export runtime, runtime mapper, real migration, or MCP expansion |
| P13.6-import-export-safe-JSON-shape-tests | memory-governance / object-model | A1/A2 | done | Add fixture-only tests for import/export-safe JSON envelope shape | `node --test tests\vcp-memory-import-export-shape.test.js`; object-model regressions; `npm test`; diff/docs validation | No `src/`, package change, import/export CLI, file generation, real memory import/export, DB/diary write, migration, or MCP expansion |
| P13.7-migration-readiness-report | memory-governance / object-model | A2 | done | Add read-only migration readiness report surface | `node --test tests\vcp-memory-migration-readiness-cli.test.js`; readiness JSON smoke; `npm test`; diff/docs validation | Reports `migrationBlocked=true` and `mutated=false`; no migration, DB/diary write, import/export apply, or MCP expansion |
| P13.x-closeout-review | memory-governance / object-model | A1 | done | Review P13 completion, remaining risks, and P14 readiness | `git diff --check`; docs validation | Closeout review added; P13 is fixture/dry-run ready, migration remains blocked, and next phase may be P14 planning only |
| P14-donor-behavior-parity-gate-planning | donor-compatibility / gate-design | A1/A2 | done | Plan donor behavior parity gates before any P14 implementation | `git diff --check`; docs validation | Planning doc added; start with planning / fixture / gate design only; do not jump to P16/P17/V8/UI or runtime implementation |
| P14.1-donor-parity-fixture-inventory | donor-compatibility / fixture-inventory | A1/A2 | done | Inventory current donor parity fixtures and standard suite gaps | `git diff --check`; docs validation | Inventory doc added; observed standard suite has `43` cases across `8` categories and `7` fixture roots; no runtime/tests/package changes |
| P14.2-DeepMemo-targeted-parity-fixtures | donor-compatibility / fixtures | A1/A2 | done | Add DeepMemo targeted parity fixtures for payload, blocked keyword meta, advanced syntax, and ranking snapshots | `node --test tests\deepmemo-donor-parity-fixture.test.js`; DeepMemo compare/rollback category gates; `npm test`; `git diff --check`; docs validation | Fixture/test evidence added in `4251a27` and confirmed on remote `main`; no runtime, MCP, package, import/export, migration, or real data write changes |
| P14.3-TopicMemo-targeted-parity-fixtures | donor-compatibility / fixtures | A1/A2 | done | Add TopicMemo targeted parity fixtures for list/content payload shape, missing topic/history errors, and alias boundaries | `node --test tests\topicmemo-donor-parity-fixture.test.js`; TopicMemo compare/rollback category gates; `npm test`; diff/docs validation | Fixture/test evidence added; no runtime, MCP, package, import/export, migration, or real data write changes |
| P14.4-error-meta-parity-tests | donor-compatibility / fixtures | A1/A2 | done | Consolidate shared donor error envelope and `meta` placement parity tests | `node --test tests\donor-error-meta-parity-fixture.test.js`; shared error/meta compare/rollback category gates; `npm test`; diff/docs validation | Fixture/test evidence added; no runtime, MCP, package, import/export, migration, or real data write changes |
| P14.5-ranking-tie-breaker-parity-tests | donor-compatibility / fixtures | A1/A2 | done | Expand ranking and tie-breaker parity fixture coverage before runtime changes | `node --test tests\donor-ranking-tie-breaker-parity-fixture.test.js`; compare/rollback ordering gates; `npm test`; diff/docs validation | Fixture/test evidence added; no runtime, MCP, package, import/export, migration, or real data write changes |
| P14.6-compare-rollback-standing-gate-summary | donor-compatibility / gate-summary | A1/A2 | done | Summarize standing compare/rollback category gates and readiness checks | full standard-suite compare/rollback smoke; `git diff --check`; docs validation | Summary doc added; compare `43/43 matched`; rollback `43/43 rollback-ready`; no runtime, MCP, package, import/export, migration, or real data write changes |
| P15-real-query-quality-gate-planning | query-quality / planning | A1/A2 | done | Plan real query quality gate after P14 donor parity standing gate summary | fixture-only query baseline; docs/diff validation | Planning doc added; current fixture recall dry-run baseline is `8/8`, `mutated=false`, `providerCalls=0`; no runtime, MCP, package, migration, import/export, provider, or real data write changes |
| P15.1-real-query-quality-fixture-inventory | query-quality / fixture-inventory | A1/A2 | todo | Inventory current query fixture coverage, missing dimensions, negative assertions, and quality gate gaps | future docs/diff validation; optional fixture-only query baseline | Inventory only; do not add runtime behavior or call providers |

## 推荐执行顺序

1. `G-002` 已完成：治理轨道已补齐，后续多 Worker 任务可以复用 Verifier rail。
2. `P1` 已完成：`real-query-suite` 现在会在脱敏 fixture 上真实验收 `mustContain / mustNotContain`。
3. `P2` 已完成：query assertion runner 已接入 `gate:ci`，`caseCount/assertedCount/failedCount` 已成为常态门禁输出。
4. `P3` 已完成：`gate:ci` JSON schema 已写入 README/VALIDATION，并用 schema snapshot 测试锁住。
5. `P4` 已完成：`governance:report` 现在输出只读 `review` surface，覆盖 proposal/tombstone/supersession/stale metrics。
6. `P5` 已完成：README / VALIDATION 已补 `governance:report` 输出样例和 troubleshooting note。
7. `P6` 已完成：dashboard/http-observe 已补更细 JSON schema snapshot。
8. `P7` 已完成：README / VALIDATION 已补 dashboard/http-observe schema contract 摘要。
9. `P8` 已完成：P10 runtime gate 已把 scoped memory runtime 推进到可信记忆内核的第一层本地门禁。
10. `P9`：长期路线图事实源已建立；近期仍按 P10 -> P11 -> P12 推进。
11. `P10.1`：已完成 runtime gate 文档/配置说明与 `gate:ci` policy preflight 输出常态化，不直接扩大 enforcement。
12. `P11`：已完成 memory lifecycle core planning；仍先规划，不直接改 runtime。
13. `P11.1`：已完成 lifecycle fixture schema tests。
14. `P11.2`：已完成 SQLite lifecycle columns dry-run planning。
15. `P11.3`：已完成 lifecycle SQLite dry-run CLI fixture tests。
16. `P11.4`：已规划 lifecycle read-policy runtime flag；不改 runtime、不改 tests、不改 `package.json`。
17. `P11.5`：已用 fixture tests 锁住 lifecycle read-policy include/exclude、private same-client/cross-client、audit summary shape；继续不改变 `search_memory` runtime 行为。
18. `P11.6`：已规划 lifecycle read-policy runtime flag implementation；不改 runtime、不改 tests、不改 `package.json`。
19. `P11.7`：已做 lifecycle read-policy runtime fixture tests，先证明 default-off、enabled filtering、missing-column 和 audit summary 契约。
20. `P11.x`：已完成 stale branch quarantine and doc salvage；`codex/p1-vcp-memory-core-100-roadmap` 只能作为 read-only reference，不能作为开发基线。
21. `P11.8`：已实现 optional lifecycle read-policy runtime flag；默认关闭，MCP public tools 不变，无 SQLite migration。
22. `P11.9`：已将 lifecycle policy summary 纳入 `gate:ci` 的 fixture-only 可见面，不依赖真实 HTTP MCP、不调用 provider、不写真实 memory。
23. `P11.10`：已将 lifecycle read-policy summary 接入 dashboard / observe:http / governance report，继续保持只读 summary 边界。
24. `P12`：controlled write tools planning 已本地提交，入口为 [docs/CONTROLLED_WRITE_TOOLS_PLAN.md](/A:/codex-memory/docs/CONTROLLED_WRITE_TOOLS_PLAN.md)；不实现 runtime mutation，不新增 MCP public tools，不做 SQLite migration。
25. `P12.1`：controlled write fixture schemas 已进入主线，锁住候选工具 schema、mutation boundary、audit shape 和 dry-run-first 规则。
26. `P12.2`：mutation audit shape tests 已进入主线，锁住 update/supersede/forget/validate/checkpoint/handoff 的 audit event shape、policy flags、redaction boundary 和 raw workspace/secret 禁止规则。
27. `P12.3`：controlled write dry-run CLI prototypes 已本地完成，新增 fixture-driven CLI，覆盖 update/supersede/forget/validate/checkpoint/handoff 和 read-only audit_memory，输出 would-plan / audit preview / safety flags，拒绝 confirm/apply/write/mutate，且始终 `mutated=false`。
28. `P12.4`：MCP tool proposal review 已进入远端主线，锁住 public tools frozen、proposal/defer 决策、P12.5 显式批准前不得 runtime mutation。
29. `A4.8`：Safe Project Operator Rail 已进入远端主线；只更新 docs/board/policy，不改变 runtime。
30. `P12.5`：first runtime mutation tool planning/approval gate 已完成；runtime mutation 仍需显式批准。
31. `P12.5`：`validate_memory` runtime fixture tests 已完成。
32. `P12.5`：narrow internal `validate_memory` runtime implementation 已完成本地验证；public MCP expansion 仍需单独批准。
33. `P12.5`：validate_memory runtime implementation plan / test matrix / rollback story 已补齐；docs/tests-design only。
34. `P12.5`：validate_memory internal runtime review 已完成，结论 PASS。
35. `P12.6`：validate_memory internal CLI wrapper 已完成本地验证；默认 dry-run，confirmed apply 必须 `--json --apply --confirm`，仍不开放 MCP。
36. 决策：保持 `validate_memory` internal-only，不进入 public `validate_memory` MCP proposal review。
37. `P13`：VCP-compatible memory object model planning 已完成本地验证，入口为 [docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md](/A:/codex-memory/docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md)。
38. `P13.1`：object model fixture schemas 已新增 `tests/fixtures/vcp-memory-object-model-v1.json` 与 `tests/vcp-memory-object-model-fixture.test.js`，锁住对象族、`MemoryRecord` vNext 字段、privacy/lifecycle/audit/import-export/backward-compatibility 边界。
39. `P13.2`：object model round-trip fixture tests 已新增 `tests/fixtures/vcp-memory-object-round-trip-v1.json` 与 `tests/vcp-memory-object-round-trip.test.js`，证明 source fixture -> normalized object -> export-safe JSON -> reloaded object 不丢失 identity/scope/lifecycle/audit/provenance/privacy/import-export boundaries。
40. `P13.3`：SQLite/diary mapping dry-run planning 已新增 [docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md](/A:/codex-memory/docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md)，规划未来只读 mapping preview、missing field report、risk report 和 rollback story。
41. `P13.4`：object mapping fixture tests 已新增 `tests/fixtures/vcp-memory-object-mapping-v1.json` 与 `tests/vcp-memory-object-mapping-fixture.test.js`，验证 synthetic SQLite / diary / audit / chunk / tag metadata 可以形成 mapping preview，并锁住 missing field policy、low-risk workspace summary、proposal/tombstone defaults、raw secret 禁止、`mutated=false` 和 no-side-effect。
42. `P13.5`：SQLite / diary mapping dry-run CLI 已新增 `src/cli/vcp-memory-object-mapping-dry-run.js`、fixture、CLI test 和 `vcp-memory:mapping:dry-run` npm script；默认 fixture mode，`mutated=false`，拒绝 `--confirm/--apply/--migrate`，不读取真实 DB/diary，不生成 import/export 文件。
43. `P13.6`：import/export-safe JSON shape fixture tests 已新增 `tests/fixtures/vcp-memory-import-export-shape-v1.json` 与 `tests/vcp-memory-import-export-shape.test.js`，验证 export/import envelope、refs、policy flags、checksum、dry-run-first、`mutated=false` 和 no-side-effect。
44. `P13.7`：migration readiness report 已新增 `src/cli/vcp-memory-migration-readiness.js`、fixture、CLI test 和 `vcp-memory:migration-readiness` npm script；报告 P13 fixture/CLI readiness，保持 `migrationBlocked=true`、`mutated=false`，拒绝 apply/migrate/confirm。
45. `P13.x`：closeout review 已新增 [docs/P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md)，确认 P13 scope/evidence/boundaries/risks，并判断可进入 P14 donor behavior parity gate planning。
46. `P14`：donor behavior parity gate planning 已新增 [docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md](/A:/codex-memory/docs/DONOR_BEHAVIOR_PARITY_GATE_PLAN.md)，规划 donor surfaces、gate categories、object-model drift boundary、validation strategy 和 P14.1-P14.6 顺序。
47. `P14.1`：donor parity fixture inventory 已新增 [docs/DONOR_PARITY_FIXTURE_INVENTORY.md](/A:/codex-memory/docs/DONOR_PARITY_FIXTURE_INVENTORY.md)，记录 DeepMemo/TopicMemo 当前 case、category、fixture 分布、覆盖面、gap register 和下一步 fixture priorities。
48. `P14.2`：DeepMemo targeted parity fixtures 已新增 `tests/fixtures/deepmemo-donor-parity-v1.json` 与 `tests/deepmemo-donor-parity-fixture.test.js`，锁住 payload shape、blocked keyword meta、advanced syntax payload 和 ranking snapshot；state reconciliation 已确认 commit `4251a27` 位于本地 HEAD、local `origin/main` 与 remote `refs/heads/main`。
49. P14.2 state reconciliation：校准 STATUS / backlog / board 的 P14.2 远端状态；commit `829817c` 已推送到 `origin/main`。
50. `P14.3`：TopicMemo targeted parity fixtures 已新增 `tests/fixtures/topicmemo-donor-parity-v1.json` 与 `tests/topicmemo-donor-parity-fixture.test.js`，锁住 ListTopics / GetTopicContent payload shape、missing topic/history error envelope、agentId alias boundary 和 locked-topic display。
51. `P14.4`：error/meta parity tests 已新增 `tests/fixtures/donor-error-meta-parity-v1.json` 与 `tests/donor-error-meta-parity-fixture.test.js`，锁住 DeepMemo / TopicMemo 共享 error envelope、diagnostic `meta` placement、DeepMemo full success diagnostics 和 known intentional differences allowlist。
52. `P14.5`：ranking/tie-breaker parity tests 已新增 `tests/fixtures/donor-ranking-tie-breaker-parity-v1.json` 与 `tests/donor-ranking-tie-breaker-parity-fixture.test.js`，锁住 standard-suite 当前全部 `ordering` cases 的显式顺序快照。
53. `P14.6`：compare/rollback standing gate summary 已新增 [docs/DONOR_PARITY_STANDING_GATE_SUMMARY.md](/A:/codex-memory/docs/DONOR_PARITY_STANDING_GATE_SUMMARY.md)，记录 standard-suite compare `43/43 matched`、rollback `43/43 rollback-ready`、targeted fixture evidence、边界和剩余风险。
54. `P15`：real query quality gate planning 已新增 [docs/P15_REAL_QUERY_QUALITY_GATE_PLAN.md](/A:/codex-memory/docs/P15_REAL_QUERY_QUALITY_GATE_PLAN.md)，记录 fixture-first gate categories、current `8/8` query baseline、安全边界和 P15.1-P15.6 future sequence。
55. 下一步建议：P15.1 real query quality fixture inventory；仍不得跳到 P16/P17/V8/UI，不主动跑真实 provider 命令。
56. provider/profile 相关动作继续保持按需触发，除非用户明确要求，不主动跑真实 provider 命令。

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
