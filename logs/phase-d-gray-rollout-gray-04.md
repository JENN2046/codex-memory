# Phase D Gray Rollout Log - Gray-04

更新时间：2026-04-23

这是一份 `Gray-04` 的持续稳定性观察记录。

## 基本信息

- 记录时间：`2026-04-23 17:12 +08:00`
- 执行人：`Codex`
- 轮次：`Gray-04`
- 当前主入口状态：
  - [x] 已切到 `codex-memory`
  - [ ] 仍为 donor / 旧实现
- 当前判断：
  - [x] 继续灰度
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮真实使用情况

```text
- 无新的代码变更
- 无新的入口配置改动
- 继续按 Gray-03 计划做一轮后续稳定性复查
- 重点确认运行态健康、compare/rollback 持续门禁，以及日志侧未出现新的异常迹象
```

## 本轮执行命令

```powershell
cd A:\codex-memory
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' | ConvertTo-Json -Depth 6
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
Get-Content -LiteralPath 'A:\codex-memory\logs\codex-memory-http.log' -Tail 40
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
未执行。

本轮不涉及异常、恢复或关键改动，因此按 Gray-03 计划没有重复补跑
mcp-contract / mcp-http 定向测试。
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

## 日志观察

```text
codex-memory-http.log 最近尾部未出现新的 error/shutdown 记录。
当前可见的是稳定的 listening 记录，没有新的异常信号。
```

## 本轮判断

- [x] 无新的 blocker
- [x] 无新的 core mismatch
- [x] 仍只有 `extended-only-drift`
- [ ] 需要暂停灰度
- [ ] 需要回滚

说明：

```text
Gray-04 的结果与 Gray-03 保持一致：
- health 继续为绿
- compare 继续 25/25 matched
- rollback 继续 25/25 rollback-safe
- 日志侧也没有新的异常迹象

因此当前不是“偶发稳定”，而是已经连续多轮稳定。
```

## 下一步

```text
- 继续进入 Gray-05
- Gray-05 通过后，可以整理“默认主链切换结论与收官说明”
```

## 快速结论

```text
Gray-04 结论：通过。

codex-memory 在 Gray-03 之后继续保持稳定，
当前可以继续推进到 Gray-05，而不需要暂停或回滚。
```
