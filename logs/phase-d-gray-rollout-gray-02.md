# Phase D Gray Rollout Log - Gray-02

更新时间：2026-04-23

这是一份 `Gray-02` 的真实主入口灰度观察记录。

说明：

- 当前 Codex 配置已经指向 `codex-memory` 的 HTTP MCP 主入口
- 用户已完成一次重启，并成功回到当前会话继续工作
- 本轮把“重启后成功恢复 + 健康检查 + compare/rollback 仍绿”视为第一次真实主入口灰度观察结果

## 基本信息

- 记录时间：`2026-04-23 17:04 +08:00`
- 执行人：`Codex`
- 轮次：`Gray-02`
- 当前主入口状态：
  - [x] 已切到 `codex-memory`
  - [ ] 仍为 donor / 旧实现
- 当前判断：
  - [x] 继续灰度
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮观察事实

```text
- 用户重启后已成功回到当前会话
- 当前未出现 vcp_codex_memory 的初始化失败或握手超时报错
- 当前 Codex 配置已指向 http://127.0.0.1:7605/mcp/codex-memory
- HTTP MCP 健康检查通过
- compare / rollback 在重启后再次复跑仍然全绿
```

## 本轮执行命令

```powershell
cd A:\codex-memory
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' | ConvertTo-Json -Depth 6
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
```

## 健康与入口结果

```text
health.ok = true
health.name = vcp_codex_memory
health.version = 0.1.0
health.protocol = streamable-http
health.path = /mcp/codex-memory

config file = C:\Users\617\.codex\config.toml
project scope = [projects.'a:\']
vcp_codex_memory.url = http://127.0.0.1:7605/mcp/codex-memory
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
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

## MCP / 会话观察

- [x] 用户重启后成功恢复到当前会话
- [x] 本轮未出现 `vcp_codex_memory` 初始化失败
- [x] 本轮未出现握手超时
- [x] HTTP MCP 仍健康
- [x] compare / rollback 仍然稳定

说明：

```text
本轮“真实观察”的核心证据不是只看 health，而是：

1. 当前 Codex 配置已经指向 codex-memory HTTP MCP
2. 用户完成重启后，仍能成功回到当前会话继续推进
3. 重启后再跑 compare / rollback，结果仍为全绿

因此这次 Gray-02 可以视为第一次真实主入口灰度观察通过。
```

## 风险判断

- [x] 无新的 blocker
- [x] 仍只有已知 `extended-only-drift`
- [x] 当前不需要暂停灰度

说明：

```text
当前没有 core mismatch，没有 rollback blocker，也没有健康检查异常。
已知差距仍然只有扩展字段漂移，不影响继续灰度。
```

## 下一步

```text
- 进入 Gray-03：继续观察一轮更贴近真实使用的持续稳定性
- 在后续真实使用过程中继续保留 compare / rollback 作为持续门禁
- 如果连续多轮没有新的 blocker，可以开始讨论从“灰度主链”推进到“默认主链”
```

## 快速结论

```text
Gray-02 结论：通过。

当前 codex-memory 已完成第一次真实主入口灰度观察：
- 配置已生效
- 重启恢复正常
- 服务健康
- compare/rollback 仍绿

可以继续灰度，不需要回滚。
```
