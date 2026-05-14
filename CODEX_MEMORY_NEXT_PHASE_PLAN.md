# codex-memory Next Phase Plan

更新时间：2026-05-14

## 目的

这份文档是 `codex-memory` 主项目收官后的薄版下一阶段计划。

它不是新的长 backlog，也不是替代 README / STATUS / `.agent_board` 的事实源。它只回答三个问题：

- 下一阶段先做什么
- 哪些能力暂时只设计不实现
- 哪些边界不能自动越过

详细任务仍以 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) 为准。

长期路线图事实源：

- [docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)

当前路线图口径：

- current: P9 scoped memory runtime integrated
- target: VCP memory practical parity 100%
- near-term priority: P10 -> P11 -> P12
- do not jump early: P16 / P17 / V8 / UI / release candidate

本文件只保留近期摘要。不要把 P10-P23 全文复制到这里，避免与路线图事实源漂移。

当前 P10.1 本地收口：

- 入口：[docs/runtime-policy-gates.md](/A:/codex-memory/docs/runtime-policy-gates.md)
- 目标：把 P10 runtime gate 的安全开关、默认行为、验证入口和 CI-safe policy preflight 固化到文档与 `gate:ci` 可见面。
- 边界：不进入 P11，不扩展 runtime enforcement，不新增 MCP tool，不调用 provider，不 push。
- P11 memory lifecycle core planning 暂缓到 P10.1 closeout 之后。

当前 P11 planning：

- 入口：[docs/MEMORY_LIFECYCLE_CORE_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_CORE_PLAN.md)
- 目标：先定义 lifecycle statuses、transition rules、audit event shape、read policy relationship 和 future test acceptance。
- 边界：docs/tests-design only；不改 runtime，不改 tests，不新增 MCP tool，不做 SQLite migration，不迁移真实数据。
- 当前进度：P11.1 fixture schema tests、P11.2 SQLite lifecycle dry-run planning、P11.3 lifecycle SQLite dry-run CLI fixture tests 均已进入远端主线。

当前 P11.4 planning：

- 入口：[docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md)
- 目标：规划 `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` 的默认关闭策略、status visibility matrix、scope 关系和 read audit summary。
- 边界：docs/tests-design only；不改 runtime，不改 tests，不改 `package.json`，不改变 `search_memory` 行为。
- 下一步建议：P11.5 lifecycle read-policy fixture tests。

当前 stale branch quarantine：

- 审查记录：[docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md](/A:/codex-memory/docs/STALE_BRANCH_REVIEW_codex_p1_vcp_memory_core_100_roadmap.md)
- `codex/p1-vcp-memory-core-100-roadmap` 是 superseded stale reference branch，不作为后续开发基线。
- Next development base remains `origin/main`; only selective, rewritten documentation salvage is allowed.

当前 P12 planning：

- 入口：[docs/CONTROLLED_WRITE_TOOLS_PLAN.md](/A:/codex-memory/docs/CONTROLLED_WRITE_TOOLS_PLAN.md)
- 目标：规划未来 `update_memory` / `supersede_memory` / `forget_memory` / `audit_memory` / `validate_memory` / `checkpoint_memory` / `handoff_memory` 等受控写入能力。
- 边界：planning only；不实现 runtime mutation，不新增 MCP public tools，不改 MCP schema，不做 SQLite migration，不写真实 memory。
- 当前进度：P12.1 fixture schemas、P12.2 mutation audit shape tests、P12.3 dry-run CLI prototypes、P12.4 MCP tool proposal review 均已进入远端主线。
- 当前治理任务：A4.8 Safe Project Operator Rail 已进入远端主线，入口为 [docs/A4_8_SAFE_PROJECT_OPERATOR_RAIL.md](/A:/codex-memory/docs/A4_8_SAFE_PROJECT_OPERATOR_RAIL.md)。
- 当前产品阶段：P12.5 first runtime mutation tool planning/approval gate 已完成，入口为 [docs/P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md](/A:/codex-memory/docs/P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md)；runtime mutation 仍需显式批准。

当前 P13 planning：

- 入口：[docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md](/A:/codex-memory/docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md)
- 决策：保持 `validate_memory` internal-only，不进入 public `validate_memory` MCP proposal review。
- 目标：规划 VCP-compatible practical object model，包括 `MemoryRecord` vNext、chunk、tag、scope/context、checkpoint/handoff、audit、tombstone、proposal 和 migration 对象族。
- 当前进度：P13 planning 已完成；P13.1 object model fixture schemas 已新增 `tests/fixtures/vcp-memory-object-model-v1.json` 与 `tests/vcp-memory-object-model-fixture.test.js`。
- 边界：fixture/tests/docs only；不改 runtime，不改 `package.json`，不新增 MCP public tools，不改 MCP schema，不做 SQLite migration，不写真实 memory。
- 下一步建议：P13.2 object model round-trip fixture tests。

## 当前判断

`codex-memory` 已经能作为 Codex / Claude 取向的本地 `vcp_codex_memory` 主线继续维护：

- HTTP MCP 是默认推荐入口
- public tools 保持 `record_memory` / `search_memory` / `memory_overview`
- standard suite 当前基线为 `43/43 matched`
- rollback readiness 当前基线为 `43/43 rollback-ready`
- Claude Code local HTTP MCP 已完成最小验收
- 当前模型侧 Claude 验收使用 `deepseek-ai/deepseek-v4-flash`

下一阶段不应该用“大迁移”或“大重构”推进，而应该进入小步、可验证、可回滚的维护与治理建设。

当前 A4.8 governance rail 已进入远端主线。该 rail 允许安全低风险工作自动 planning / validation / guarded commit / readiness / safe-push，但不会越过 A5 hard stops。

## 阶段顺序

| Phase | 名称 | 当前动作 |
|---|---|---|
| Phase F | docs governance / maintenance foundation | 当前优先 |
| Phase G | CI-safe gate | ✅ 已实现 `npm run gate:ci` |
| Phase H | memory governance | ✅ H-001~H-002c 全部完成（含真实 SQLite migration） |
| Phase I | Codex / Claude client scope | ✅ I-002a~I-002c 全部完成 |
| Phase J | observability / review report | ✅ J-001~J-003 全部完成（含 dashboard CLI） |

不要跳过 Phase F。文档入口、事实源和维护队列不清楚时，后续 runtime 变化会越来越难审。

## Phase F 当前批次

本批只做 docs / board / governance，不碰 runtime。

目标：

- 建立文档事实源分工
- 新增 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
- 把下一阶段计划压缩成薄文档
- 让 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) 承担唯一维护期任务队列
- 保持 README 是 operation map，不让 README 继续变成历史总汇
- 保持 [PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md) 基本冻结
- 普通 push-after gate 只写 `.agent_board`，不创建 checkpoint-20

## Phase G 候选

`gate:mainline` 是真实本地主线门禁，会检查 HTTP health、compare 和 rollback。

`gate:ci` 如果后续实现，必须是 CI-safe：

- 不访问真实 `127.0.0.1:7605`
- 不要求本机 HTTP MCP 已启动
- 不调用真实 provider
- 不读写真实 `.codex` / Claude 配置
- 不依赖本地 `data/` durable state
- 不运行 `rebuild-profile --confirm`
- 不运行 cleanup apply / confirm

第一版 `gate:ci` 应该只跑 fixture-only 检查。`rebuild-profile --dry-run`、`profile-gate`、`v8-diagnose` 只有在明确 fixture/profile sandbox 后才可纳入默认 CI gate。

设计入口：[GATE_CI_FIXTURE_ONLY_DESIGN.md](/A:/codex-memory/GATE_CI_FIXTURE_ONLY_DESIGN.md)

## Phase H 候选

memory governance 先做设计文档，不直接改 runtime。

建议拆分：

| Step | 目标 | 风险 |
|---|---|---|
| H-001 | 写 `MEMORY_GOVERNANCE_MODEL.md` | A0 — 已完成：见 [MEMORY_GOVERNANCE_MODEL.md](/A:/codex-memory/MEMORY_GOVERNANCE_MODEL.md) |
| H-002a | 设计 proposal / tombstone / supersession schema | A0 — 已完成：见 [PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md](/A:/codex-memory/docs/PROPOSAL_TOMBSTONE_SUPERSESSION_SCHEMA.md) |
| H-002b | migration dry-run / fixture migration plan | A1 |
| H-002c | 真实 SQLite schema change | A2，需要单独验证 |

不要把“设计 schema”和“修改真实 SQLite schema”混成同一个任务。

短期不新增 MCP tool。治理能力先通过内部设计和 CLI 只读报告验证，稳定后再讨论 `propose_memory` / `review_memory` / `supersede_memory` 等新工具。

当前补充边界设计入口：

- [POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md](/A:/codex-memory/docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md)
- 用来回答 proposal lifecycle、scope retrieval、visibility policy、future enforcement 的分层关系
- 当前结论仍是先定 decision shape 和 soft boundary，不直接改写路径

## Phase I 候选

Codex / Claude scope 先建模型，不改 `record_memory` 外部 schema。

优先设计：

- `client_id`
- `workspace_id`
- `project_id`
- `task_id`
- `conversation_id`
- `visibility`
- `retention_policy`

Phase I 进度：
- M-013 ✅ [CLIENT_SCOPE_MODEL.md](/A:/codex-memory/CLIENT_SCOPE_MODEL.md) — client scope 模型
- I-002a ✅ [SCOPE_SCHEMA_EXTENSION.md](/A:/codex-memory/docs/SCOPE_SCHEMA_EXTENSION.md) — scope schema 扩展设计（含入 H-002a 合并迁移方案）

audit / overview / search scope filter 属于后续实现任务。

## Phase J 候选

观测与审查先做报告，不先做 Web UI。

候选顺序：

1. 设计 `memory-dashboard` report shape ✅ [MEMORY_DASHBOARD_REPORT_DESIGN.md](/A:/codex-memory/docs/MEMORY_DASHBOARD_REPORT_DESIGN.md)
2. ✅ 做只读 CLI / Markdown / JSON 输出（`npm run dashboard`）
3. ✅ 汇总 health、overview、audit、profile、rollback readiness
4. CLI 稳定后再评估 local-only Web UI ✅ [LOCAL_WEB_UI_ASSESSMENT.md](/A:/codex-memory/docs/LOCAL_WEB_UI_ASSESSMENT.md) — 结论：当前不建议实现

## 禁止自动执行

- push outside explicit user authorization or the A4.8 safe-push policy / PR / release / deploy / tag
- 改 `.env` / secrets / provider key
- 改 `C:\Users\617\.codex\config.toml`
- 改 Claude / Codex 真实配置
- 真实 `provider-smoke`
- 真实 `provider-benchmark`
- `rebuild-profile --confirm`
- cleanup apply / confirm
- 迁移真实数据
- 导出大量真实 memory
- 删除 diary / logs / indexes
- 添加或升级依赖
- 修改 package manager
- 大规模架构重写

## 本地提交规则

本地 commit 可以在 guarded auto-commit 条件满足时执行：

- 当前任务已完成
- 相关验证通过或验证缺口已记录
- diff 已检查
- 只包含相关文件
- 不包含 secrets / `.env` / dependency manifest 变更
- `.agent_board` 已更新

push 只能在显式授权或 A4.8 safe-push policy 通过 readiness 时执行。

## 验证

docs-only 最小验证：

```powershell
git diff --check
```

如果文档引用 npm scripts，确认脚本存在于 `package.json`。

当前基线或维护入口变化后，跑：

```powershell
npm run gate:mainline
```

## 第一批推荐执行

1. 完成 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
2. 把 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) 作为唯一维护期任务队列
3. 压缩 README / PHASE_NAVIGATION 的历史记录入口，只保留索引链接
4. 将 `gate:ci` 留在设计阶段，不立刻改 `.github/workflows`
5. 将 memory governance 留在模型设计阶段，不立刻做 SQLite migration
