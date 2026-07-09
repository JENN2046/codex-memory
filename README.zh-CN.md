# codex-memory

[English README](README.md)

`codex-memory` 是 Codex 访问 VCPToolBox 原生记忆的受治理 MCP 桥。
它不负责重做记忆智能；VCPToolBox 仍是原生记忆行为的 owner。

这个项目的核心价值是治理：谁能访问、访问哪个范围和运行时、能披露多少输出、
如何留下审计证据，以及出错时如何保持可回滚。

## 当前状态

当前 active path：

```text
Codex
  -> 127.0.0.1:7625 上的 vcp_codex_memory MCP
  -> codex-memory governed bridge
  -> 127.0.0.1:7615 上的 VCP native shim
  -> VCPToolBox native memory
  -> 127.0.0.1:3000 上的 WSL-local NewAPI provider
```

live read path 已经通过 WSL-local NewAPI 的 production-provider proof。
真实 Codex client dogfood 已调用过：

- `search_memory`
- `memory_overview`
- `audit_memory`

这些工具当前只作为只读工具暴露。旧 `7605` 服务保留为 rollback target；
`7625` 仍处于真实使用观察期。

write tools 当前不属于 Codex client surface。原生写入需要 exact operator
approval、bounded rollback posture，以及单独的 real-root write proof。

## 快速开始

启动或查看 WSL-local native bridge 托管服务：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:start
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
```

运行 production-provider read proof：

```bash
npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

停止托管服务：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:stop
```

## Codex MCP 配置

当前 Codex client target：

```toml
[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7625/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
bearer_token_env_var = "CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN"
enabled_tools = ["search_memory", "memory_overview", "audit_memory"]
default_tools_approval_mode = "prompt"

[mcp_servers.vcp_codex_memory.tools.search_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.memory_overview]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.audit_memory]
approval_mode = "approve"
```

`CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN` 应从托管服务的 runtime token file 加载。
不要打印或提交 token material。

## 治理模型

bridge 治理这些维度：

- `client_id`
- scope 和 visibility
- runtime target
- invocation profile
- read/write authority
- output disclosure budget
- audit receipt
- rollback posture

本地 `codex-memory` 存储只承担辅助角色：

- fallback
- audit
- validation fixture
- compatibility
- offline continuity

## 边界

- VCPToolBox 仍是 native memory behavior owner。
- 本仓库不应修改 VCPToolBox 原生源码。
- runtime endpoint、token、raw memory、raw audit、raw provider response
  不应通过 MCP result 披露。
- fixture provider proof 不是 production-provider proof。
- read proof 不是 write proof。
- `7625` dogfood 还不是对旧 `7605` 的正式替换。

## 开发

安装依赖：

```bash
npm install
```

运行默认测试：

```bash
npm test
```

运行 governed native bridge 相关的聚焦测试：

```bash
node --test tests/security-profile-config.test.js tests/governed-mcp-vcp-native-bridge-app-integration.test.js
```

## 文档

- 运行态台账：[docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md](docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md)
- WSL-local NewAPI proof runbook：[docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md](docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md)
- 历史 Codex/Claude integration runbook：[docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md](docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md)
