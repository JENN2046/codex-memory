# Maintenance Backlog

更新时间：2026-05-06

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

- 最新已推送主线提交：`93ec4bf docs: sync claude flash push baseline`
- 最新独立 mainline gate 检查点：[phase-e-mainline-gate-checkpoint-19.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-19.md)
- 最新 board-only 推送后复核：`.agent_board/VALIDATION_LOG.md` 的 `CMV-0042`
- 标准 suite：`39/39 matched`
- rollback readiness：`39/39 rollback-ready`
- HTTP health：`200`
- checkpoint-20 未创建

## 维护期队列

| ID | Area | Risk | Status | Task | Validation | Notes |
|---|---|---|---|---|---|---|
| M-001 | donor-compatibility | A1 | todo | 继续补高价值 `DeepMemo / TopicMemo` 标准 suite case | targeted compare / rollback；必要时 `npm run gate:mainline` | 优先真实可感知边界，不追无价值枚举 |
| M-002 | donor-compatibility | A1 | todo | donor 别名字段边角 polish | relevant CLI tests + compare / rollback | 只在 source/suite 证明 drift 或用户可感知时做 |
| M-003 | donor-compatibility | A1 | todo | 排序和错误语义边角继续回归化 | category compare / rollback；必要时 `npm test` | Phase E 已收主体，维护期只补新增 case |
| M-004 | provider-profile | A0/A2 | todo | 真实 provider benchmark 报告留档 | `provider-benchmark` 需显式授权；记录用 provider 模板 | 不自动调用远端 provider |
| M-005 | provider-profile | A1 | todo | profile migration 证据沉淀 | dry-run/profile health/profile gate；confirm 需显式授权 | 默认只读或 dry-run |
| M-006 | docs-governance | A0 | done | 文档入口继续压缩，减少重复 checkpoint 噪音 | `git diff --check` / link check | 已在本地维护批次压缩 README / PHASE_NAVIGATION / STATUS 的重复记录入口；尚待远端同步 |
| M-007 | docs-governance | A0 | done | `.agent_board` board-only 记录按批次聚合 | diff inspection | 已在本地维护批次聚合 board-only 验证 ledger；不创建 checkpoint-20 |
| M-008 | next-phase | A1 | done | 准备 Phase F / Codex-Claude memory governance / client scope 的候选计划 | docs review / no runtime change | 已压缩为 [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)；尚待远端同步 |
| M-009 | claude-client | A1 | done | Claude MCP 接入最小验收 | HTTP health / `claude mcp get/list` / direct MCP `memory_overview` / `deepseek-ai/deepseek-v4-flash` model-mediated `memory_overview` / `gate:mainline` | config 已写入且 MCP connected；当前模型侧调用使用 `deepseek-ai/deepseek-v4-flash` 并已成功；仅交互式 `/mcp` 面板可后补 |
| M-010 | docs-governance | A0 | done | 建立文档事实源分工规则 | `git diff --check` / link check / `npm run gate:mainline` | 新增 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)；尚待远端同步 |
| M-011 | ci-gate | A1 | todo | 设计 `gate:ci` fixture-only 边界 | docs review / no runtime change | 先设计，不改 `package.json` / `.github/workflows` |
| M-012 | memory-governance | A1 | todo | 起草 memory governance model | docs review / no runtime change | 先写模型，不做 SQLite migration |
| M-013 | client-scope | A1 | todo | 起草 Codex / Claude client scope model | docs review / no runtime change | 先写 scope model，不改 MCP contract |

## 推荐执行顺序

1. `M-006` 和 `M-007`：先保持维护期入口清爽，避免 Phase E 收官后继续堆噪音。
2. `M-001`：挑一个用户真实可感知的 donor case，补进标准 suite。
3. `M-004`：只有需要 provider 证据时，再在明确授权下跑真实 benchmark 并留档。
4. `M-009`：明确授权后再执行 `claude mcp add`，完成 Claude Code 实机接入验收。
5. `M-011`：先把 CI-safe gate 的 fixture-only 边界写清楚，再决定是否实现。
6. `M-012` 和 `M-013`：只做治理 / scope 模型设计，不直接改 runtime。

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
