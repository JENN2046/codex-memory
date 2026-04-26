# Phase D Gray Rollout Playbook

更新时间：2026-04-23

这份 playbook 用于在 `Phase D` 已完成首轮迁移验收之后，执行“灰度切主链 + compare/rollback 持续守门”。

适用前提：

- [x] 已完成 [PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- [x] 当前结论为 `Pass` 或 `Pass with Known Gaps`
- [x] 当前没有 migration blocker

当前默认前提：

- 当前结论是 `Pass with Known Gaps`
- 已知 gap 仅为稳定的 `extended-only-drift`
- core compatibility path 已通过
- rollback readiness 已通过

## 目标

这轮灰度切换的目标不是一次性宣布“全部 donor 扩展字段彻底收官”，而是：

1. 让 `codex-memory` 进入真实主链观察期
2. 保持 compare / rollback 作为持续门禁
3. 一旦出现 core mismatch 或 readiness 退化，可以快速回退

## 一、切换前检查

执行前至少确认一次：

```powershell
cd A:\codex-memory
npm test
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

通过标准：

- `npm test` 全绿
- compare 标准集 `matchedCaseCount = totalCaseCount`
- rollback 标准集 `readyCaseCount = totalCaseCount`
- `coreMismatchCountTotal = 0`
- `blockerBreakdown = {}`

允许存在但需记录的已知项：

- `extended-only-drift`
- `extendedMismatchCountTotal > 0`

如果这一步失败：

- 不进入灰度切换
- 先回到 compare / rollback 报告定位问题

## 二、灰度切换执行顺序

建议顺序：

1. 保留 donor 侧作为只读对照源，不删除原链路
2. 让主入口先指向 `codex-memory`
3. 保留 compare / rollback 命令和标准 suite 数据集不动
4. 在灰度期内，每次关键变更后都重新跑 compare / rollback 门禁

执行原则：

- 不同时移除 donor 对照能力和切主链
- 不在灰度第一步就追求 extended payload 零漂移
- 先看 core path 稳不稳，再决定要不要继续追 donor 扩展字段

## 三、灰度期观察项

灰度期最重要的不是“字段更多了没有”，而是“兼容链路有没有退化”。

重点观察：

- MCP 是否能稳定初始化
- `record_memory / search_memory / memory_overview` 是否持续可用
- compare 是否继续保持 `matchedCaseCount = totalCaseCount`
- rollback 是否继续保持 `readyCaseCount = totalCaseCount`
- `coreMismatchCountTotal` 是否从 `0` 抬头
- `blockerBreakdown` 是否开始出现非空项

建议观察命令：

```powershell
cd A:\codex-memory
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

需要深挖时再切 JSON：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
```

## 四、继续灰度的通过标准

满足下面条件时，可以继续维持灰度主链：

- `coreMismatchCountTotal = 0`
- compare 仍为全量 matched
- rollback 仍为全量 rollback-safe
- blocker 仍为空
- 新问题只落在已知的 `extended-only-drift` 范围内

推荐判断：

```text
只要 core path 没坏、rollback readiness 没坏、阻断项没出现，
就不因为 extended-only drift 单独终止灰度。
```

## 五、立即暂停灰度的触发条件

以下任一出现，都应该暂停灰度并回到只读对照模式：

- compare 出现 `mismatchedCaseCount > 0`
- rollback 出现 `notReadyCaseCount > 0`
- `coreMismatchCountTotal > 0`
- `blockerBreakdown` 非空且不是已知可接受项
- MCP 初始化、核心工具契约、主调用链出现不稳定失败

优先级最高的回退信号：

1. `coreMismatchCountTotal > 0`
2. `rollbackReady = false`
3. `blockerBreakdown` 出现新的 blocker

## 六、回滚动作

回滚时保持原则简单：

1. 把主入口切回 donor / 旧实现
2. 保留当前 compare / rollback 报告作为现场材料
3. 不删除 `codex-memory` 的数据和诊断文档
4. 用标准 suite 复跑一次，确认 donor 侧恢复到可用状态

最小回滚确认：

```powershell
cd A:\codex-memory
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

回滚后需要记录：

- 触发回滚的时间
- 触发原因
- 哪个 category / fixture / case 最先暴露问题
- 是否属于 core mismatch、readiness blocker，还是运行环境问题

## 七、灰度结束条件

满足下面条件时，可以考虑从“灰度主链”推进到“默认主链”：

- 灰度期间 compare / rollback 长期稳定
- 没出现新的 blocker
- 没出现 core mismatch
- 团队已经确认 donor 只需要继续作为回归对照，不再是日常主链依赖

如果后续目标继续提高，可以分两条线：

1. 功能线：保持现在的主链稳定性，继续扩 case 覆盖
2. 对齐线：继续消化 `extended-only-drift`，追 donor 扩展 payload 手感

## 八、建议的日常执行模板

日常小检查：

```powershell
cd A:\codex-memory
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

关键改动后检查：

```powershell
cd A:\codex-memory
npm test
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

建议记录项：

- 日期
- 变更内容
- compare 结果
- rollback 结果
- 是否新增 drift / blocker
- 是否继续灰度
