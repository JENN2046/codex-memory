# Phase Navigation

更新时间：2026-05-05

## 先看哪里

如果你刚回到项目，推荐按这个顺序恢复上下文：

1. 当前状态：[STATUS.md](/A:/codex-memory/STATUS.md)
2. 项目收官：[PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md)
3. 阶段结论：[PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
4. 当前记忆：[MEMORY.md](/A:/codex-memory/MEMORY.md)
5. 后续 backlog：[PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md)

## 想确认“主链是否已经收官”

- 项目正式收官说明：[PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md)
- 默认主链切换结论：[PHASE_D_DEFAULT_MAINLINE_CONCLUSION.md](/A:/codex-memory/PHASE_D_DEFAULT_MAINLINE_CONCLUSION.md)
- Phase E 阶段总结：[PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)

## 想看“Phase D 是怎么验收和灰度的”

- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)
- 灰度执行模板：[PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md)
- Gray-02 执行前清单：[PHASE_D_GRAY_02_PRECHECK.md](/A:/codex-memory/PHASE_D_GRAY_02_PRECHECK.md)
- Gray-03 稳定性计划：[PHASE_D_GRAY_03_STABILITY_PLAN.md](/A:/codex-memory/PHASE_D_GRAY_03_STABILITY_PLAN.md)
- 后续轮次骨架：[PHASE_D_GRAY_FOLLOWUP_LOG_SKELETON.md](/A:/codex-memory/PHASE_D_GRAY_FOLLOWUP_LOG_SKELETON.md)

对应记录：

- [phase-d-gray-rollout-gray-01.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-01.md)
- [phase-d-gray-rollout-gray-02-precheck-pass.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-02-precheck-pass.md)
- [phase-d-gray-rollout-gray-02.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-02.md)
- [phase-d-gray-rollout-gray-03.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-03.md)
- [phase-d-gray-rollout-gray-04.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-04.md)
- [phase-d-gray-rollout-gray-05.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-05.md)

## 想看“Phase E 现在已经做完了什么”

- Phase E 阶段总结：[PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
- Phase E backlog：[PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md)

关键收口记录：

- 扩展字段 drift：[phase-e-extended-drift-closure-01.md](/A:/codex-memory/logs/phase-e-extended-drift-closure-01.md)
- 扩展字段 drift 复验：[phase-e-extended-drift-baseline-02.md](/A:/codex-memory/logs/phase-e-extended-drift-baseline-02.md)
- 错误语义诊断：[phase-e-error-diagnostics-01.md](/A:/codex-memory/logs/phase-e-error-diagnostics-01.md)
- `TopicMemo` 路由边界：[phase-e-topicmemo-topic-id-routing-01.md](/A:/codex-memory/logs/phase-e-topicmemo-topic-id-routing-01.md)
- `TopicMemo empty-history / history-read-error`：[phase-e-error-diagnostics-02.md](/A:/codex-memory/logs/phase-e-error-diagnostics-02.md)
- `TopicMemo GetTopicContent agent-not-found`：[phase-e-error-diagnostics-03.md](/A:/codex-memory/logs/phase-e-error-diagnostics-03.md)
- 错误语义进标准 suite 门禁：[phase-e-error-semantics-suite-gate-01.md](/A:/codex-memory/logs/phase-e-error-semantics-suite-gate-01.md)
- donor 别名字段：[phase-e-deepmemo-donor-alias-meta-01.md](/A:/codex-memory/logs/phase-e-deepmemo-donor-alias-meta-01.md)
- query 别名字段：[phase-e-deepmemo-query-alias-meta-01.md](/A:/codex-memory/logs/phase-e-deepmemo-query-alias-meta-01.md)
- 文档收口检查点：[phase-e-documentation-closure-checkpoint-01.md](/A:/codex-memory/logs/phase-e-documentation-closure-checkpoint-01.md)

排序 tie-breaker：

- [phase-e-ordering-tiebreaker-01.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-01.md)
- [phase-e-ordering-tiebreaker-02.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-02.md)
- [phase-e-ordering-tiebreaker-03.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-03.md)
- [phase-e-ordering-tiebreaker-04.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-04.md)
- [phase-e-ordering-tiebreaker-05.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-05.md)
- [phase-e-ordering-tiebreaker-06.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-06.md)

## 想做日常运维 / 排障 / 回滚

先看 README 的命令入口说明：[README.md](/A:/codex-memory/README.md)

重点 CLI：

- compare：`npm run compare-active-memory`
- rollback：`npm run rollback-active-memory`
- mainline gate：`npm run gate:mainline`
- strict gate：`npm run gate:mainline:strict`
- HTTP observe：`npm run observe:http`
- rollback plan：`npm run rollback:mainline:plan`

日常入口：

- Phase E 日常自检：[PHASE_E_DAILY_SELF_CHECK.md](/A:/codex-memory/PHASE_E_DAILY_SELF_CHECK.md)
- HTTP MCP 运行态排障：[PHASE_E_HTTP_OBSERVABILITY.md](/A:/codex-memory/PHASE_E_HTTP_OBSERVABILITY.md)
- 默认主链回滚 runbook：[PHASE_E_ROLLBACK_RUNBOOK.md](/A:/codex-memory/PHASE_E_ROLLBACK_RUNBOOK.md)

对应运行记录：

- 日常自检验收：[phase-e-daily-self-check-01.md](/A:/codex-memory/logs/phase-e-daily-self-check-01.md)
- HTTP MCP 运行态观察：[phase-e-http-observability-01.md](/A:/codex-memory/logs/phase-e-http-observability-01.md)
- HTTP MCP 运行态观察：[phase-e-http-observability-02.md](/A:/codex-memory/logs/phase-e-http-observability-02.md)
- HTTP MCP 运行态观察：[phase-e-http-observability-03.md](/A:/codex-memory/logs/phase-e-http-observability-03.md)
- 回滚 runbook 验收：[phase-e-rollback-runbook-01.md](/A:/codex-memory/logs/phase-e-rollback-runbook-01.md)
- 主线 gate 检查点：[phase-e-mainline-gate-checkpoint-01.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-01.md)
- 主线 gate 检查点：[phase-e-mainline-gate-checkpoint-02.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-02.md)
- 主线 gate 检查点：[phase-e-mainline-gate-checkpoint-03.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-03.md)
- `MEMORY.md` 状态 handoff：[phase-e-memory-status-handoff-01.md](/A:/codex-memory/logs/phase-e-memory-status-handoff-01.md)
- 回滚演练：[phase-e-mainline-rollback-drill-01.md](/A:/codex-memory/logs/phase-e-mainline-rollback-drill-01.md)

## 想继续推进什么

- 如果目标是“继续稳定维护默认主链”：先看 [PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
- 如果目标是“继续排优先级做后续精修”：先看 [PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md)
- 如果目标是“恢复最近决策和基线”：先看 [MEMORY.md](/A:/codex-memory/MEMORY.md)

## 当前推荐恢复路径

最省事的一条路径是：

1. 看 [STATUS.md](/A:/codex-memory/STATUS.md)
2. 看 [PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md)
3. 看 [PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
4. 如果要继续做事，再看 [PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md)
