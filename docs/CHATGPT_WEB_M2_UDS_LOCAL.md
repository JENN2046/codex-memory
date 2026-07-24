# ChatGPT Web R3 M2 — 本地 UDS 实施边界

状态：本地代码与合成 UDS 验证已实现；默认关闭。本文件不是 Tunnel、App、ChatGPT 连接、真实记忆读取、发布或就绪证明。

M2 提供仅限 WSL/Linux 的 Streamable HTTP Unix Domain Socket（UDS）入口。启用时，`src/http-index.js` 只会选择该 UDS 入口，不会回退到 TCP listener。

固定逻辑端点如下：

- `/mcp/codex-memory/chatgpt/v0` → `chatgpt_web_transport_probe_v0`
- `/mcp/codex-memory/chatgpt/v1` → `chatgpt_web_read_only_v1`
- `/mcp/codex-memory/chatgpt/v2` → `chatgpt_web_context_v2`

v2 的 `prepare_memory_context` 仍由 M4 composite-read gate 隐藏；M2 不会提前开放它。

## 本地防线

- UDS socket 目录必须是 `0700`，socket 必须是 `0600`。
- UDS 路径必须是 Linux 绝对路径，且拒绝 `/mnt/...` 共享挂载路径。
- 本地 bridge auth 只从私有文件引用读取，拒绝非私有文件；所有 GET、POST、DELETE 都要求 `X-Codex-Memory-Bridge-Auth`。
- `Authorization` 不能作为 bridge auth；forwarded headers、未批准 Origin 与浏览器 fetch metadata 均 fail closed。
- POST 要求同时接受 `application/json` 和 `text/event-stream`；GET 要求接受 `text/event-stream`。
- 会话绑定 endpoint generation 与协商的 MCP protocol version；未初始化、缺失、未知或跨 generation 会话均被拒绝。
- ChatGPT Web profile 仍固定为 `runtimeInvocationAllowed: false`。即使通过 UDS 完成协议握手，`tools/call` 仍返回 `chatgpt_web_runtime_not_bound`，不会调用应用层记忆工具。
- 当 UDS profile 被启用时，HTTP entrypoint 不调用应用的存储初始化；M2 listener 只提供握手、会话与 schema surface。M3 之前不能把它当成真实记忆 runtime。

## 配置面

默认均为关闭或未配置。后续经明确授权的本地运行会使用以下配置面：

- `CODEX_MEMORY_CHATGPT_WEB_UDS_ENABLED`
- `CODEX_MEMORY_CHATGPT_WEB_UDS_SOCKET_DIR`
- `CODEX_MEMORY_CHATGPT_WEB_UDS_SOCKET_NAME`
- `CODEX_MEMORY_CHATGPT_WEB_BRIDGE_AUTH_FILE`
- `CODEX_MEMORY_CHATGPT_WEB_UDS_PROFILES`
- `CODEX_MEMORY_CHATGPT_WEB_UDS_ALLOWED_ORIGINS`

One additional default-off implementation gate is available for later
authorized validation:

- `CODEX_MEMORY_CHATGPT_WEB_COMPOSITE_READ_GATE_PASSED`

It only permits the v2 profile to advertise `prepare_memory_context`. Runtime
application invocation remains unconditionally unbound in this branch, and
setting the gate is not runtime evidence by itself.

socket 目录和 bridge-auth 文件引用保存在非枚举私有配置中，不会出现在 MCP metadata、工具 schema 或配置 JSON 投影中。

## 合成验证

Windows 上运行的测试会跳过 UDS listener；WSL/Linux 下使用临时目录、临时合成 bridge secret 和假应用对象验证：

```text
node --test tests/chatgpt-web-http-conformance.test.js
```

该测试不调用 `createCodexMemoryApplication`，不启动真实服务，不建立 Tunnel，不访问 ChatGPT，也不会读取真实记忆。
