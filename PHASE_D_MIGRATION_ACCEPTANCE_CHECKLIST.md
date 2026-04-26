# Phase D Migration Acceptance Checklist

更新时间：2026-04-23

这份清单用于判断 `codex-memory` 是否已经具备切换到新主链路的条件。

建议使用方式：

1. 先跑文本模式，快速看摘要和 blocker / drift 分布
2. 再跑 JSON 模式，确认 case 级原因和聚合字段
3. 最后再启用门禁参数 `--require-match` / `--require-ready`

## 验收结论

- [ ] `Pass`
- [x] `Pass with Known Gaps`
- [ ] `Fail`

结论说明：

```text
2026-04-23 首轮 Phase D 独立迁移验收通过。

结论为 Pass with Known Gaps，而不是纯 Pass，原因不是核心兼容失败，
而是 compare 仍存在稳定的 extended-only drift：

- 标准 suite 共 25/25 case 在 core compatibility path 上全部 matched
- rollback readiness 为 true，25/25 case 全部 rollback-safe
- blockerBreakdown 为空，没有迁移阻断项
- 但 compare 侧仍有 25/25 case 命中 extended-only-drift
- 当前累计 extendedMismatchCountTotal = 185

因此当前判断是：
- 可以进入切换前验收后的灰度切主链阶段
- 不建议把“扩展字段完全零漂移”当作当前切换门槛
- 如果目标是 donor 原始 payload 也尽量贴齐，后续还可以继续收 toolName/tool_name、
  agentId/agent_id、maid/maidName、command、resultCount 等扩展字段
```

## 环境记录

- 日期：`2026-04-23`
- 执行人：`Codex`
- 仓库路径：`A:\codex-memory`
- 数据集：`A:\codex-memory\benchmarks\active-memory-suite\standard-suite.json`
- MCP 入口：
  - [x] `HTTP MCP`
  - [x] `stdio MCP`
- donor 参考源：
  - [x] `VCPChat`
  - [x] `VCPToolBox`

## A. 基础可运行性

- [x] `npm test` 通过
- [x] `compare-vcp-active-memory-cli.test.js` 定向通过
- [x] `rollback-active-memory-cli.test.js` 定向通过
- [x] `vcp_codex_memory` MCP 能正常初始化
- [x] `record_memory / search_memory / memory_overview` 契约仍可用
- [x] 新仓库在 donor 运行时未参与的情况下仍可独立启动和验收

建议命令：

```powershell
cd A:\codex-memory
npm test
node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js
```

记录：

```text
npm test => 80/80 通过
node --test compare + rollback => 25/25 通过

npm test 内已覆盖：
- stdio MCP initialize + tools/list + record/search/overview
- HTTP MCP initialize + tools/list + tools/call
```

## B. Compare 验收

### B1. 总体验收

- [x] 标准 suite 文本模式输出可读
- [x] 标准 suite JSON 模式输出字段完整
- [x] `--require-match` 下标准 suite 通过
- [x] `comparisonBreakdown` 符合预期
- [x] `driftReasonBreakdown` 符合预期

建议命令：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
```

本轮结果：

```text
summary.ok = true
totalCaseCount = 25
comparableCaseCount = 25
matchedCaseCount = 25
mismatchedCaseCount = 0
legacyUnavailableCaseCount = 0
matchedAll = true
comparisonBreakdown = { matched: 25 }
driftReasonBreakdown = { extended-only-drift: 25 }
coreMismatchCountTotal = 0
extendedMismatchCountTotal = 185
fixturePreparation.preparedFixtureCount = 6
```

### B2. 文本模式检查

- [x] 顶部存在 `comparison-breakdown`
- [x] 顶部存在 `drift-reason-breakdown`
- [x] `category-aggregate` 行能直接看出重点 drift
- [x] case 行能直接看出 `outcome`
- [x] case 行能直接看出 `driftReasons`

本轮观察：

```text
文本模式已直接输出：
- [comparison-breakdown] matched=25
- [drift-reason-breakdown] extended-only-drift=25
- category / fixture 行内 drift 预览
- case 行内 outcome=matched 与 driftReasons=extended-only-drift
```

### B3. JSON 模式检查

- [x] `summary.comparisonBreakdown`
- [x] `summary.driftReasonBreakdown`
- [x] `categoryAggregate[*].comparisonBreakdown`
- [x] `categoryAggregate[*].driftReasonBreakdown`
- [x] `fixtureAggregate[*].comparisonBreakdown`
- [x] `fixtureAggregate[*].driftReasonBreakdown`
- [x] `cases[*].comparison.outcome`
- [x] `cases[*].comparison.driftReasons`

### B4. 缩范围能力

- [x] `--category`
- [x] `--expectation`
- [x] `--tool`
- [x] `--fixture`
- [x] `--tag`
- [x] `--tag-all`
- [x] `--exclude-tag`
- [x] `--exclude-fixture`

验收判断：

```text
compare 已达到“可作为迁移门禁前置对照工具”的状态。
当前唯一已知差距不是 core mismatch，而是扩展字段持续比 donor 更丰富。
```

## C. Rollback 验收

### C1. 总体验收

- [x] 标准 suite 文本模式输出可读
- [x] 标准 suite JSON 模式输出字段完整
- [x] `--require-ready` 下标准 suite 通过
- [x] `recommendationBreakdown` 符合预期
- [x] `blockerBreakdown` 符合预期

建议命令：

```powershell
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

本轮结果：

```text
summary.ok = true
rollbackReady = true
totalCaseCount = 25
readyCaseCount = 25
notReadyCaseCount = 0
recommendation = rollback-safe
recommendationBreakdown = { rollback-safe: 25 }
blockerBreakdown = {}
coreMismatchCountTotal = 0
extendedMismatchCountTotal = 185
```

### C2. 文本模式检查

- [x] 顶部存在 `recommendationBreakdown`
- [x] 顶部存在 `blockerBreakdown`
- [x] `category-aggregate` 行能直接看出 blocker 集中点
- [x] case 行能直接看出 `outcome`
- [x] case 行能直接看出 `blockerReasons`

本轮观察：

```text
文本模式已直接输出：
- recommendationBreakdown: rollback-safe=25
- blockerBreakdown 为空
- case 行内 outcome=rollback-safe
- case 行内 blockerReasons 为空
```

### C3. JSON 模式检查

- [x] `summary.recommendationBreakdown`
- [x] `summary.blockerBreakdown`
- [x] `categoryAggregate[*].recommendationBreakdown`
- [x] `categoryAggregate[*].blockerBreakdown`
- [x] `fixtureAggregate[*].recommendationBreakdown`
- [x] `fixtureAggregate[*].blockerBreakdown`
- [x] `cases[*].summary.outcome`
- [x] `cases[*].summary.blockerReasons`

### C4. 缩范围能力

- [x] `--category`
- [x] `--expectation`
- [x] `--tool`
- [x] `--fixture`
- [x] `--tag`
- [x] `--tag-all`
- [x] `--exclude-tag`
- [x] `--exclude-fixture`

验收判断：

```text
rollback 已达到“可作为切换安全网”的状态。
本轮没有出现 ready=false 的 case，也没有 blocker 原因聚集。
```

## D. 标准集与稳定性

- [x] 标准 suite 仍为 `25` 个 mixed-tool case
- [x] fixture manifest 覆盖守门正常
- [x] `metaVersion / metaSchema` 正常
- [x] case 分类元数据完整
- [x] fixture 临时复制 + 固定 `mtime` 机制正常

重点检查：

- [x] `vchat-fixture`
- [x] `vchat-fixture-no-settings`
- [x] `vchat-fixture-multi-agent`
- [x] `vchat-fixture-ranking`
- [x] `vchat-fixture-ranking-extended`
- [x] `vchat-fixture-multi-topic-large`

本轮记录：

```text
fixturePreparation.preparedFixtureCount = 6

已准备的标准 fixture root：
- vchat-fixture
- vchat-fixture-no-settings
- vchat-fixture-multi-agent
- vchat-fixture-ranking
- vchat-fixture-ranking-extended
- vchat-fixture-multi-topic-large
```

## E. 风险与阻断项

本轮阻断项：

- [x] 无阻断项
- [ ] 有阻断项，禁止切换主链

阻断说明：

```text
本轮未发现阻断切换的 blocker。
```

已知但可接受的差距：

```text
compare 仍存在稳定的 extended-only drift，当前表现为：

- 25/25 case 的 core path 完全匹配 donor
- 25/25 case 同时带有 extended-only-drift
- 扩展字段差异总量 185

当前主要差异集中在：
- toolName / tool_name
- agentId / agent_id
- maid / maidName
- command
- resultCount / result_count
- 部分错误 case 的 code

这些差异不会破坏当前 compare/rollback 的核心兼容门禁，因此暂定为 known gaps，
而不是 migration blocker。
```

## F. 切换建议

- [x] 可以继续保持 compare-only 对照观察
- [x] 可以接入 rollback readiness 门禁
- [x] 可以灰度切主链
- [ ] 可以作为默认主链
- [x] 需要围绕 donor 扩展字段继续收口

建议说明：

```text
当前建议是：

1. 进入“灰度切主链 + compare/rollback 持续守门”阶段
2. 不必等待 extendedMismatchCountTotal 归零后再切
3. 切换后继续保留：
   - compare suite
   - rollback suite
   - 标准 fixture manifest 守门
4. 如果后续目标从“核心兼容 + 可回滚”提升到“扩展 payload 也尽量 donor 原样”，
   再继续处理 extended-only drift

换句话说：
Phase D 现在已经具备迁移验收通过后的灰度切换条件，但还不建议直接宣告
“所有 donor 扩展字段语义已完美收官”。
```
