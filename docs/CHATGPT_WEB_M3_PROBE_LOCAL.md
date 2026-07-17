# ChatGPT Web R3 M3-T1 — 本地安全概览探测

状态：仅完成本地代码与合成测试。该实现不是 ChatGPT 连通、Tunnel、真实记忆读取、真实审计写入、发布或就绪证明。

M3-T1 为 `memory_overview` 增加可选 `probe_nonce`。只有服务端构建的
`chatgpt_web_transport_probe_v0` 上下文可使用它；其他上下文或无效 nonce
都会在零接触路径上返回拒绝结果。

## 不变量

- `probe_nonce` 长度为 16–96 字符；响应只返回 SHA-256 digest，绝不返回或持久化原始 nonce。
- nonce digest 只保存在进程内存 5 分钟，且单次使用；重放会被拒绝。
- 应用层在任何 no-token overview、store、audit、VCP runtime 或 local recall 调用之前短路 probe。
- probe 响应固定声明：零本地记忆读取、零 native memory call、零 durable memory mutation。
- 当前本地实现的 `operationalAuditWriteCount` 为 `0`；没有读取或写入真实审计流。
- M1 的 `chatgpt_web_runtime_not_bound` 门仍在 MCP adapter 中先行拒绝调用，因此本次没有使 ChatGPT Web 真正调用应用层。

## 验证

合成测试使用会在任何依赖被访问时抛错的假存储，并覆盖首次 nonce、重放、TTL 过期、错误 profile、无效 nonce、应用层短路和 M1 门回归：

```text
node --test tests/chatgpt-web-memory-overview-probe.test.js
node --test tests/chatgpt-web-client-isolation.test.js
```

M3-T2/T3/T4、M4 composite read、UDS 服务启动、Tunnel、ChatGPT、provider、真实 memory/audit/runtime 均不在此阶段范围内。
