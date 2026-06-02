# Phase Navigation

更新时间：2026-06-02

## 先看哪里

如果你刚回到项目，先用这条瘦身后的恢复路径：

1. 操作地图：[README.md](/A:/codex-memory/README.md)
2. 当前事实：[STATUS.md](/A:/codex-memory/STATUS.md)
3. 后续路线：[CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
4. 当前 Phase H 入口：[docs/PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY.md](/A:/codex-memory/docs/PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY.md)
5. 当前任务与验证：[.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md) / [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)

文档职责边界见：[DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)。

历史 Phase D/E、checkpoint、灰度、suite 扩容和旧 CM/Pxx 证据默认按索引查，不作为恢复上下文的第一跳。

## 想确认“主链是否已经收官”

- 项目正式收官说明：[PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md)
- 默认主链切换结论：[PHASE_D_DEFAULT_MAINLINE_CONCLUSION.md](/A:/codex-memory/PHASE_D_DEFAULT_MAINLINE_CONCLUSION.md)
- Phase E 阶段总结：[PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
- Phase E 最终收官：[PHASE_E_FINAL_CLOSEOUT.md](/A:/codex-memory/PHASE_E_FINAL_CLOSEOUT.md)
- 维护期 backlog：[MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)

## 想看“Phase D 是怎么验收和灰度的”

- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)
- 灰度执行模板：[PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md)
- Gray-02 执行前清单：[PHASE_D_GRAY_02_PRECHECK.md](/A:/codex-memory/PHASE_D_GRAY_02_PRECHECK.md)
- Gray-03 稳定性计划：[PHASE_D_GRAY_03_STABILITY_PLAN.md](/A:/codex-memory/PHASE_D_GRAY_03_STABILITY_PLAN.md)
- 后续轮次骨架：[PHASE_D_GRAY_FOLLOWUP_LOG_SKELETON.md](/A:/codex-memory/PHASE_D_GRAY_FOLLOWUP_LOG_SKELETON.md)

对应记录：完整清单见 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)（gate checkpoint、灰度记录、suite 扩容、tie-breaker、错误语义等全量历史记录）

## 想看“Phase E 现在已经做完了什么”

- Phase E 阶段总结：[PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
- Phase E 最终收官：[PHASE_E_FINAL_CLOSEOUT.md](/A:/codex-memory/PHASE_E_FINAL_CLOSEOUT.md)
- Phase E backlog：[PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md)
- 维护期 backlog：[MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)

关键收口记录：完整清单见 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)

排序 tie-breaker：完整清单见 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)

## 想做日常运维 / 排障 / 回滚

先看 README 的命令入口说明：[README.md](/A:/codex-memory/README.md)

重点 CLI：

- compare：`npm run compare-active-memory`
- rollback：`npm run rollback-active-memory`
- mainline gate：`npm run gate:mainline`
- strict gate：`npm run gate:mainline:strict`
- HTTP observe：`npm run observe:http`
- rollback plan：`npm run rollback:mainline:plan`
- Claude MCP acceptance：[CLAUDE_MCP_ACCEPTANCE.md](/A:/codex-memory/CLAUDE_MCP_ACCEPTANCE.md)

日常入口：

- 所有运行记录统一索引：[PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)（gate checkpoint、board-only 复核、HTTP 运行态、回滚、suite 扩容、错误语义基线）
- HTTP MCP 运行态排障：[PHASE_E_HTTP_OBSERVABILITY.md](/A:/codex-memory/PHASE_E_HTTP_OBSERVABILITY.md)
- 维护期自推进计划：[.omc/plans/MAINTENANCE_AUTOPILOT.md](/.omc/plans/MAINTENANCE_AUTOPILOT.md)

所有对应运行记录统一汇总于索引：[PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)（gate checkpoint、board-only 复核、HTTP 运行态、回滚、suite 扩容、错误语义基线、Claude MCP 接入验收等全量历史记录，不再散列于本入口文档）

## 想继续推进什么

- 如果目标是“继续稳定维护默认主链”：先看 [PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
- 如果目标是“继续排优先级做后续精修”：先看 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)
- 如果目标是“收束文档事实源”：先看 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
- 如果目标是“规划下一阶段”：先看 [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)，再看 [docs/PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY.md](/A:/codex-memory/docs/PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY.md)
- 如果目标是“设计 CI-safe gate”：先看 [GATE_CI_FIXTURE_ONLY_DESIGN.md](/A:/codex-memory/GATE_CI_FIXTURE_ONLY_DESIGN.md)
- 如果目标是“恢复最近决策和基线”：先看 [MEMORY.md](/A:/codex-memory/MEMORY.md)

## 当前推荐恢复路径

最省事的一条路径是：

1. 看 [README.md](/A:/codex-memory/README.md)
2. 看 [STATUS.md](/A:/codex-memory/STATUS.md)
3. 看 [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
4. 看 [docs/PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY.md](/A:/codex-memory/docs/PHASE_H_CLIENT_SCOPE_BOUNDARY_INVENTORY.md)
5. 看 [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md) 和 [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)
6. 如果要改文档入口，先看 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
