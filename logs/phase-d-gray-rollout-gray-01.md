# Phase D Gray Rollout Log - Gray-01

更新时间：2026-04-23

这是一份“灰度前基线记录”。

说明：

- 本轮目标是把首轮迁移验收结果正式固化为 `Gray-01` 起点
- 本轮没有代码变更
- 本轮没有执行主入口切换
- 当前仍处于“准备进入灰度切主链”的状态

## 基本信息

- 记录时间：`2026-04-23 16:18 +08:00`
- 执行人：`Codex`
- 轮次：`Gray-01`
- 当前主入口状态：
  - [ ] 已切到 `codex-memory`
  - [x] 仍为 donor / 旧实现
- 当前判断：
  - [x] 继续灰度
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮变更

```text
- 无代码变更
- 无主入口切换
- 把首轮迁移验收结果固化为 Gray-01 基线记录
```

## 环境与入口

- 仓库路径：`A:\codex-memory`
- 标准 suite：`A:\codex-memory\benchmarks\active-memory-suite\standard-suite.json`
- MCP 入口：
  - [x] `HTTP MCP`
  - [x] `stdio MCP`
- donor 对照源：
  - [x] `VCPChat`
  - [x] `VCPToolBox`

## 本轮执行命令

```powershell
cd A:\codex-memory
npm test
node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

## 验收基线

- [x] `npm test` 通过
- [x] compare 文本模式已检查
- [x] rollback 文本模式已检查
- [x] compare JSON / `--require-match` 已检查
- [x] rollback JSON / `--require-ready` 已检查

记录：

```text
npm test => 80/80
node --test compare + rollback => 25/25
```

## Compare 结果

```text
summary.ok = true
totalCaseCount = 25
matchedCaseCount = 25
mismatchedCaseCount = 0
legacyUnavailableCaseCount = 0
coreMismatchCountTotal = 0
extendedMismatchCountTotal = 185
comparisonBreakdown = { matched: 25 }
driftReasonBreakdown = { extended-only-drift: 25 }
```

是否命中暂停条件：

- [ ] `mismatchedCaseCount > 0`
- [ ] `coreMismatchCountTotal > 0`
- [ ] 出现新的非预期 drift
- [x] 无

重点 category / fixture / case：

```text
无新的风险聚集点。

当前 drift 为稳定的 extended-only-drift，分布在整套标准集上，
不是某个单独 category / fixture / case 的新异常抬头。
```

## Rollback 结果

```text
summary.ok = true
rollbackReady = true
totalCaseCount = 25
readyCaseCount = 25
notReadyCaseCount = 0
coreMismatchCountTotal = 0
extendedMismatchCountTotal = 185
recommendation = rollback-safe
recommendationBreakdown = { rollback-safe: 25 }
blockerBreakdown = {}
```

是否命中暂停条件：

- [ ] `rollbackReady = false`
- [ ] `notReadyCaseCount > 0`
- [ ] `blockerBreakdown` 出现新的 blocker
- [x] 无

重点 category / fixture / case：

```text
无。

当前 rollback 侧没有 blocker 聚集，也没有单点 fixture / case 失稳。
```

## MCP / 主调用链观察

- [x] MCP 初始化稳定
- [x] `record_memory` 可用
- [x] `search_memory` 可用
- [x] `memory_overview` 可用
- [x] 无异常

异常记录：

```text
无新的主调用链异常。

本轮依据首轮迁移验收中的 MCP 覆盖结果：
- stdio MCP initialize + tools/list + record/search/overview 已通过
- HTTP MCP initialize + tools/list + tools/call 已通过
```

## 判断

### 是否继续灰度

- [x] 是
- [ ] 否

理由：

```text
当前 core compatibility path 稳定，rollback readiness 稳定，且没有 blocker。
虽然 compare 仍存在 extended-only-drift，但这属于已知 gap，不构成当前灰度阻断。
```

### 是否需要回滚

- [x] 否
- [ ] 是，立即回滚
- [ ] 是，先冻结观察再决定

理由：

```text
本轮尚未切主入口，因此不存在实际回滚动作。
从门禁结果看，也没有出现需要中止后续灰度的信号。
```

## 已知差距变化

- [x] 无新增已知差距
- [x] 仍只有 `extended-only-drift`
- [ ] 出现新的已知差距

说明：

```text
当前已知差距仍集中在扩展字段，不影响 core path：

- toolName / tool_name
- agentId / agent_id
- maid / maidName
- command
- resultCount / result_count
- 部分 error case 的 code
```

## 下一步

```text
- 进入 Gray-02：执行第一轮真实主入口灰度切换观察
- 切换后立即复跑 compare / rollback 门禁
- 若仍保持 matched=25、rollback-safe=25、coreMismatchCountTotal=0，则继续灰度
```

## 快速结论

```text
Gray-01 结论：

- 当前仍是灰度前基线，不是已切主链状态
- 可以进入下一轮真实灰度切换观察
- 当前不需要回滚
- 当前不需要因 extended-only-drift 停止推进
```
