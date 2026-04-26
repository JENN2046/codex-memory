# Phase D Gray Rollout Log - Gray-02 Precheck Pass

更新时间：2026-04-23

这是一份 `Gray-02` 执行前通过记录。

说明：

- 本轮目标是确认第一次真实主入口灰度切换观察是否已经具备执行条件
- 本轮没有代码变更
- 本轮没有修改 Codex 配置
- 本轮已经确认：门禁已绿、服务已健康、目标入口已配置到位

## 基本信息

- 记录时间：`2026-04-23 16:52 +08:00`
- 执行人：`Codex`
- 轮次：`Gray-02-Precheck`
- 当前主入口状态：
  - [ ] 已确认通过新会话完成主入口观察
  - [x] 配置已指向 `codex-memory` HTTP MCP
  - [x] 仍待新会话 / 新线程完成真实观察
- 当前判断：
  - [x] 允许进入 `Gray-02` 真实切换观察
  - [ ] 暂停灰度
  - [ ] 执行回滚

## 本轮执行命令

```powershell
cd A:\codex-memory
npm test
npm run start:http:ensure
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health' | ConvertTo-Json -Depth 6
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

## 结果摘要

```text
npm test => 80/80
start:http:ensure => already healthy
health.ok => true
health.name => vcp_codex_memory
health.protocol => streamable-http
health.path => /mcp/codex-memory

compare.summary.ok => true
compare.matchedCaseCount => 25
compare.mismatchedCaseCount => 0
compare.coreMismatchCountTotal => 0
compare.extendedMismatchCountTotal => 185
compare.driftReasonBreakdown => { extended-only-drift: 25 }

rollback.summary.ok => true
rollback.rollbackReady => true
rollback.readyCaseCount => 25
rollback.notReadyCaseCount => 0
rollback.coreMismatchCountTotal => 0
rollback.blockerBreakdown => {}
```

## 当前 Codex 配置观察

读取到的当前配置要点：

```text
config file: C:\Users\617\.codex\config.toml
project scope present: [projects.'a:\']

[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7605/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
```

判断：

- 当前 Codex 配置已经指向 `codex-memory` 的 HTTP MCP 主入口
- 当前不需要再改 `vcp_codex_memory` 的目标地址
- `Gray-02` 剩余的关键动作不是“改配置”，而是“用新会话验证真实切换观察”

## 风险判断

- [x] 无新的 blocker
- [x] 仍只有已知 `extended-only-drift`
- [x] 不需要因为当前状态暂停 `Gray-02`

说明：

```text
目前没有新的 core mismatch、readiness blocker、HTTP 健康失败或入口配置错误。
当前已知 gap 仍是扩展字段漂移，不构成 Gray-02 前置阻断。
```

## 下一步

```text
进入 Gray-02 的真实主入口灰度观察。

推荐动作：
1. 使用当前已配置好的 vcp_codex_memory HTTP MCP 入口
2. 通过新会话 / 新线程观察真实启动与调用行为
3. 观察后按灰度执行记录模板补一份 Gray-02 正式记录
```

## 快速结论

```text
Gray-02 precheck 已通过。

当前状态不是“入口还没改”，而是“入口已经改好并通过门禁，
现在只差一次新的真实会话观察来完成 Gray-02”。
```
