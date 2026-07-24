# ChatGPT Web R3 M3-T2 — 本地 lineage 与 health receipt

状态：仅完成本地 receipt 构造与合成测试；未进行 UDS/HTTP 服务启动、Tunnel 控制面、ChatGPT App 或真实记忆/审计探测。

M3-T2 增加两个纯函数模块：

- `ChatGptWebLineageReceipt` 只接收 SHA-256 指纹，覆盖 C5 要求的组织、workspace、Tunnel、runtime key reference、tunnel-client profile、UDS、MCP profile、tool manifest 与 App scan coverage 绑定。
- `ChatGptWebHealthReceipt` 需要低披露 lineage receipt，并分别检查 `local_mcp`、`tunnel_control_plane` 与 `chatgpt_app_reachability` 三层健康声明。

两种 receipt 都匹配 R3 的 `tunnel_lineage_receipt_v2` / `health_closeout_receipt_v2` 基本字段；其输出不含原始 ID、endpoint、路径、token、secret、记忆内容或原始审计。所有本地结果最多为 `candidate`，固定声明 `liveEvidenceVerified=false`、`closeoutEligible=false`，因此不构成 E2E、连通、发布或就绪证明。

缺失 lineage 指纹、Tunnel/App 不匹配、缺失任一健康层，都会 fail-closed 为 `blocked`，并使用 C5 failure code：`LINEAGE_UNVERIFIED`、`LINEAGE_TUNNEL_APP_MISMATCH`、`HEALTH_LOCAL_MCP_UNHEALTHY`、`HEALTH_CONTROL_PLANE_UNVERIFIED` 或 `HEALTH_CHATGPT_REACHABILITY_FAILED`。

验证：

```text
node --test tests/chatgpt-web-lineage-health-receipt.test.js
```

后续 M3/M4 代码候选的当前状态见 `CHATGPT_WEB_R3_IMPLEMENTATION_MATRIX.md`。真实三层 health、E2E nonce、UDS 服务、Tunnel、ChatGPT、provider 与真实 memory/audit 仍未执行。
