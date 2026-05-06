# Claude MCP Minimal Acceptance 01

时间：2026-05-06

## 目标

为 `codex-memory` 建立 Claude MCP 接入的最小验收路径，并完成不写外部配置的本地预检。

## 范围

- Claude Code 本地 HTTP MCP 接入。
- 不自动写入 Claude 用户配置。
- 不修改 Codex 配置。
- 不修改 `.env` / provider key。
- 不运行真实 provider smoke / benchmark。

## 本地预检结果

| Check | Result |
|---|---|
| `Get-Command claude` | found: `C:\Users\617\.local\bin\claude.exe` |
| `claude` version | `2.1.100.0` |
| `Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'` | `ok=true`, `name=vcp_codex_memory`, `protocol=streamable-http`, `path=/mcp/codex-memory` |
| `claude mcp list` | runnable; current configured servers are `ccs-image-analysis` and `ccs-websearch`; `vcp_codex_memory` is not configured yet |

## 验收入口

主入口：

- [CLAUDE_MCP_ACCEPTANCE.md](/A:/codex-memory/CLAUDE_MCP_ACCEPTANCE.md)

待授权命令：

```powershell
claude mcp add --transport http --scope local vcp_codex_memory http://127.0.0.1:7605/mcp/codex-memory
```

回滚命令：

```powershell
claude mcp remove vcp_codex_memory
```

## 结果

`PARTIAL`

已完成：

- 本地 HTTP endpoint 预检。
- Claude CLI 可用性预检。
- Claude MCP 列表只读检查。
- 最小验收步骤和通过标准已文档化。

未完成：

- 未执行 `claude mcp add`。
- 未写入 Claude 配置。
- 未在 Claude Code `/mcp` 面板验证。
- 未由 Claude 实际调用 `memory_overview`。

## Blocker

执行 `claude mcp add` 会写入 Claude 本地/用户配置，属于工作区外写入，需要明确授权。

## 下一步

明确授权后，执行 `claude mcp add --transport http --scope local vcp_codex_memory http://127.0.0.1:7605/mcp/codex-memory`，随后按 [CLAUDE_MCP_ACCEPTANCE.md](/A:/codex-memory/CLAUDE_MCP_ACCEPTANCE.md) 跑 `claude mcp get` / `claude mcp list` / `/mcp` / `memory_overview` / `npm run gate:mainline`。
