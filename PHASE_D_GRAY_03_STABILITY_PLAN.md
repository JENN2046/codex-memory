# Phase D Gray-03 Stability Observation Plan

更新时间：2026-04-23

这份计划用于把 `Gray-03` 之后的持续稳定性观察标准化，重点覆盖后续 `Gray-04 / Gray-05` 两轮真实使用观察。

配套文档：

- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)
- 灰度执行记录模板：[PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md)
- `Gray-03` 稳定性观察记录：[phase-d-gray-rollout-gray-03.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-03.md)
- 后续轮次记录骨架：[PHASE_D_GRAY_FOLLOWUP_LOG_SKELETON.md](/A:/codex-memory/PHASE_D_GRAY_FOLLOWUP_LOG_SKELETON.md)

## 目标

`Gray-03` 之后不再只是验证“能不能切”，而是验证：

1. 真实使用下是否持续稳定
2. 重启、恢复、正常调用后是否仍然保持绿灯
3. compare / rollback 是否继续充当可靠门禁
4. 是否已经具备从“灰度主链”提升为“默认主链”的条件

## 观察周期

建议至少再做两轮：

- `Gray-04`
  - 聚焦真实使用后的短周期稳定性
  - 至少覆盖一次正常使用后的 compare / rollback 复查
- `Gray-05`
  - 聚焦再一轮真实使用后的持续稳定性
  - 用来判断是否可以给出“默认主链”切换结论

## 每轮必查项

每轮至少检查一次：

```powershell
cd A:\codex-memory
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' | ConvertTo-Json -Depth 6
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

如果该轮涉及异常、恢复、重启或关键改动，再补：

```powershell
node --test .\tests\mcp-contract.test.js .\tests\mcp-http.test.js
```

## 每轮记录重点

后续每轮都应记录：

- 这一轮是否发生真实使用
- 是否发生重启 / 会话恢复
- HTTP MCP 是否健康
- MCP 契约是否仍稳定
- compare 是否仍为 `25/25 matched`
- rollback 是否仍为 `25/25 rollback-safe`
- 是否出现新的 `coreMismatchCount > 0`
- 是否出现新的 `blockerBreakdown`
- 是否出现新的非预期 drift

## 继续灰度的标准

满足下面条件，就继续灰度：

- `health.ok = true`
- compare 仍全量 matched
- rollback 仍全量 rollback-safe
- `coreMismatchCount = 0`
- `blockerBreakdown = {}`
- 新问题没有超出当前已知 `extended-only-drift`

## 暂停灰度的标准

满足任一条件，就暂停并重新评估：

- `mismatched > 0`
- `rollbackReady = false`
- `coreMismatchCount > 0`
- 出现新的 blocker
- 出现新的初始化失败、握手超时或主调用链异常

## 推进到默认主链的标准

满足下面条件时，可以开始写“默认主链切换结论”：

- `Gray-04` 通过
- `Gray-05` 通过
- 期间没有新的 blocker
- 期间没有新的 core mismatch
- 期间没有新的运行态异常趋势

## 交付物

`Gray-03` 之后建议形成三类持续交付物：

1. 每轮一份观察记录
2. 若有异常，补一份专项说明
3. 到 `Gray-05` 后给出一份“默认主链切换结论”
