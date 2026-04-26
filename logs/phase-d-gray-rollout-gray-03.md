# Phase D Gray Rollout Log - Gray-03

更新时间：2026-04-23

这是一份 `Gray-03` 的持续稳定性观察记录。

说明：

- 本轮目标不是再次证明“能启动”，而是确认切到 `codex-memory` 之后，运行态仍然稳定
- 本轮在 `Gray-02` 已通过的基础上，继续检查健康、MCP 契约和 compare/rollback 持续门禁
- 本轮没有代码变更，也没有调整入口配置

## 基本信息

- 记录时间：`2026-04-23 17:07 +08:00`
- 执行人：`Codex`
- 轮次：`Gray-03`
- 当前主入口状态：
  - [x] 已切到 `codex-memory`
  - [ ] 仍为 donor / 旧实现
- 当前判断：
  - [x] 继续灰度
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮执行命令

```powershell
cd A:\codex-memory
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' | ConvertTo-Json -Depth 6
node --test .\tests\mcp-contract.test.js .\tests\mcp-http.test.js
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

## 健康结果

```text
health.ok = true
health.name = vcp_codex_memory
health.version = 0.1.0
health.protocol = streamable-http
health.path = /mcp/codex-memory
```

## MCP 契约结果

```text
node --test mcp-contract + mcp-http => 5/5

覆盖：
- stdio MCP initialize + server info
- stdio MCP tools + record/search/overview
- HTTP MCP initialize + session header
- HTTP MCP health + tools/list
- HTTP MCP tools/call(record_memory)
```

## Compare 结果

```text
status = ok
cases = 25
comparable = 25
matched = 25
mismatched = 0
coreMismatchCount = 0
extendedMismatchCount = 185
comparison-breakdown = matched=25
drift-reason-breakdown = extended-only-drift=25
fixtures.prepared = 6
```

## Rollback 结果

```text
status = ok
rollbackReady = true
totalCaseCount = 25
readyCaseCount = 25
notReadyCaseCount = 0
recommendation = rollback-safe
coreMismatchCountTotal = 0
extendedMismatchCountTotal = 185
recommendationBreakdown = rollback-safe=25
blockerBreakdown = {}
```

## 稳定性判断

- [x] HTTP MCP 持续健康
- [x] MCP 契约持续可用
- [x] compare 持续全量 matched
- [x] rollback 持续全量 rollback-safe
- [x] 无新的 blocker
- [x] 无新的 core mismatch

说明：

```text
Gray-03 的重点是“持续稳定性”，不是单次启动成功。

本轮结果说明：
- 入口切换后不是一次性好运气
- 运行态下 MCP 仍能初始化、列工具、执行工具
- compare / rollback 仍保持和 Gray-02 一致的稳定结果

因此当前已经可以把 codex-memory 视为“灰度中稳定”的主链，而不是刚切上去的不确定状态。
```

## 已知差距

```text
当前已知差距没有变化，仍然只有 extended-only-drift：
- count = 25
- extendedMismatchCount = 185

这仍然不影响 core compatibility path，也不影响 rollback readiness。
```

## 下一步

```text
- 进入 Gray-04 / 默认主链讨论阶段
- 如果接下来没有新的运行态异常，可以开始讨论把“灰度主链”提升为“默认主链”
- 若仍希望继续 donor 扩展 payload 对齐，则单独作为后续精修线推进
```

## 快速结论

```text
Gray-03 结论：通过。

当前 codex-memory 不只是“能切上去”，而且已经表现出持续稳定性：
- health 通过
- MCP 契约通过
- compare 通过
- rollback 通过

可以继续保持主链，不需要回滚。
```
