# Phase D Gray Rollout Log - Gray-05

更新时间：2026-04-23

这是一份 `Gray-05` 的持续稳定性观察记录。

## 基本信息

- 记录时间：`2026-04-23 17:16 +08:00`
- 执行人：`Codex`
- 轮次：`Gray-05`
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
- 按 Gray-03 稳定性计划完成第二轮后续稳定性观察
- 重点确认 Gray-04 之后是否仍保持相同的稳定结果
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

本轮不涉及异常、恢复或关键改动，因此按稳定性计划没有重复补跑
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
codex-memory-http.log 最近尾部仍未出现新的 error/shutdown 记录。
当前仍只看到稳定的 listening 记录，没有新的异常信号。
```

## 本轮判断

- [x] 无新的 blocker
- [x] 无新的 core mismatch
- [x] 仍只有 `extended-only-drift`
- [ ] 需要暂停灰度
- [ ] 需要回滚

说明：

```text
Gray-05 与 Gray-04、Gray-03 保持一致：
- health 持续为绿
- compare 持续 25/25 matched
- rollback 持续 25/25 rollback-safe
- 日志侧没有新的异常迹象

这意味着当前不是“短时间稳定”，而是已经完成了计划中的后续稳定性观察闭环。
```

## 下一步

```text
- 开始整理“默认主链切换结论与收官说明”
- 如果后续没有新的运行态异常，可以把 codex-memory 从“灰度主链”提升为“默认主链”
- donor 扩展 payload 的进一步贴齐，作为后续精修线单独推进
```

## 快速结论

```text
Gray-05 结论：通过。

Gray-03 计划里的后续两轮稳定性观察已经完成：
- Gray-04 通过
- Gray-05 通过

当前 codex-memory 已具备从“灰度主链”推进到“默认主链”的条件。
```
