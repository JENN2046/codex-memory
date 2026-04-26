# Phase D Gray Rollout Log Template

更新时间：2026-04-23

这份模板用于记录 `Phase D` 灰度切主链期间的每一轮观察结果。

配套文档：

- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)

建议做法：

1. 每一轮灰度观察单独复制一份记录
2. 关键变更后必须补一条
3. 一旦触发暂停或回滚，也继续沿用这份模板补完现场信息

---

## 基本信息

- 记录时间：
- 执行人：
- 轮次：`Gray-01 / Gray-02 / ...`
- 当前主入口状态：
  - [ ] 已切到 `codex-memory`
  - [ ] 仍为 donor / 旧实现
- 当前判断：
  - [ ] 继续灰度
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮变更

```text
<填写本轮做了什么，例如：
- 切换主入口到 codex-memory
- 更新某个 active-memory CLI 行为
- 仅做观察，无代码变更
>
```

## 环境与入口

- 仓库路径：`A:\codex-memory`
- 标准 suite：`A:\codex-memory\benchmarks\active-memory-suite\standard-suite.json`
- MCP 入口：
  - [ ] `HTTP MCP`
  - [ ] `stdio MCP`
- donor 对照源：
  - [ ] `VCPChat`
  - [ ] `VCPToolBox`

## 本轮执行命令

```powershell
cd A:\codex-memory
npm test
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

如需深挖：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
```

关键改动后推荐门禁：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

## 验收基线

- [ ] `npm test` 通过
- [ ] compare 文本模式已检查
- [ ] rollback 文本模式已检查
- [ ] compare JSON / `--require-match` 已检查
- [ ] rollback JSON / `--require-ready` 已检查

## Compare 结果

```text
summary.ok =
totalCaseCount =
matchedCaseCount =
mismatchedCaseCount =
legacyUnavailableCaseCount =
coreMismatchCountTotal =
extendedMismatchCountTotal =
comparisonBreakdown =
driftReasonBreakdown =
```

是否命中暂停条件：

- [ ] `mismatchedCaseCount > 0`
- [ ] `coreMismatchCountTotal > 0`
- [ ] 出现新的非预期 drift
- [ ] 无

重点 category / fixture / case：

```text
<填写最值得看的 category / fixture / case，没有就写“无”>
```

## Rollback 结果

```text
summary.ok =
rollbackReady =
totalCaseCount =
readyCaseCount =
notReadyCaseCount =
coreMismatchCountTotal =
extendedMismatchCountTotal =
recommendation =
recommendationBreakdown =
blockerBreakdown =
```

是否命中暂停条件：

- [ ] `rollbackReady = false`
- [ ] `notReadyCaseCount > 0`
- [ ] `blockerBreakdown` 出现新的 blocker
- [ ] 无

重点 category / fixture / case：

```text
<填写最值得看的 category / fixture / case，没有就写“无”>
```

## MCP / 主调用链观察

- [ ] MCP 初始化稳定
- [ ] `record_memory` 可用
- [ ] `search_memory` 可用
- [ ] `memory_overview` 可用
- [ ] 无异常

异常记录：

```text
<填写初始化失败、超时、输出异常、工具契约异常等，没有就写“无”>
```

## 判断

### 是否继续灰度

- [ ] 是
- [ ] 否

理由：

```text
<填写继续灰度或暂停灰度的原因>
```

### 是否需要回滚

- [ ] 否
- [ ] 是，立即回滚
- [ ] 是，先冻结观察再决定

理由：

```text
<填写触发回滚或暂不回滚的原因>
```

## 已知差距变化

- [ ] 无新增已知差距
- [ ] 仍只有 `extended-only-drift`
- [ ] 出现新的已知差距

说明：

```text
<填写 drift / blocker / payload 差距变化，没有就写“无”>
```

## 下一步

```text
<填写下一步动作，例如：
- 继续灰度观察
- 针对某类 extended drift 做对齐
- 暂停灰度并回滚
- 补某个 case / fixture / 门禁
>
```

---

## 快速判定参考

可以继续灰度：

- `matchedCaseCount = totalCaseCount`
- `rollbackReady = true`
- `coreMismatchCountTotal = 0`
- `blockerBreakdown = {}`
- 新问题只在已知 `extended-only-drift` 范围内

需要暂停灰度：

- `mismatchedCaseCount > 0`
- `notReadyCaseCount > 0`
- `coreMismatchCountTotal > 0`
- 出现新的 blocker

建议回滚：

- compare core path 失配
- rollback readiness 退化
- MCP / 核心工具契约出现持续不稳定
