# Phase D Gray Follow-up Log Skeleton

更新时间：2026-04-23

这份骨架用于 `Gray-04 / Gray-05 / ...` 之后的持续稳定性观察记录。

使用方式：

1. 复制一份
2. 把标题里的轮次改成当前轮次
3. 按本轮真实情况填充

---

# Phase D Gray Rollout Log - Gray-XX

更新时间：

这是一份 `Gray-XX` 的持续稳定性观察记录。

## 基本信息

- 记录时间：
- 执行人：
- 轮次：`Gray-XX`
- 当前主入口状态：
  - [ ] 已切到 `codex-memory`
  - [ ] 仍为 donor / 旧实现
- 当前判断：
  - [ ] 继续灰度
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮真实使用情况

```text
<填写本轮是否发生真实使用、重启、恢复、异常、关键改动，没有就写“无”>
```

## 本轮执行命令

```powershell
cd A:\codex-memory
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' | ConvertTo-Json -Depth 6
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

如需补契约检查：

```powershell
node --test .\tests\mcp-contract.test.js .\tests\mcp-http.test.js
```

## 健康结果

```text
health.ok =
health.name =
health.version =
health.protocol =
health.path =
```

## MCP 契约结果

```text
<填写本轮是否执行 mcp-contract / mcp-http，没有就写“未执行”>
```

## Compare 结果

```text
status =
cases =
comparable =
matched =
mismatched =
coreMismatchCount =
extendedMismatchCount =
comparison-breakdown =
drift-reason-breakdown =
fixtures.prepared =
```

## Rollback 结果

```text
status =
rollbackReady =
totalCaseCount =
readyCaseCount =
notReadyCaseCount =
recommendation =
coreMismatchCountTotal =
extendedMismatchCountTotal =
recommendationBreakdown =
blockerBreakdown =
```

## 本轮判断

- [ ] 无新的 blocker
- [ ] 无新的 core mismatch
- [ ] 仍只有 `extended-only-drift`
- [ ] 需要暂停灰度
- [ ] 需要回滚

说明：

```text
<填写判断理由>
```

## 下一步

```text
<填写下一步，例如继续 Gray-05、准备默认主链结论、暂停灰度、回滚等>
```

## 快速结论

```text
Gray-XX 结论：
<填写本轮一句话结论>
```
