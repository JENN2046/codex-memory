# Claude MCP Minimal Acceptance

更新时间：2026-05-06

## 结论

`codex-memory` 已具备 Claude MCP 接入的本地 HTTP 前置条件：

- HTTP MCP health 已返回 `ok`
- endpoint 是 `http://127.0.0.1:7605/mcp/codex-memory`
- service name 是 `vcp_codex_memory`
- public tools 仍是 `record_memory` / `search_memory` / `memory_overview`
- 本机已检测到 `claude` CLI

实际把服务器写入 Claude 配置需要执行 `claude mcp add ...`，这会修改 Claude 的用户/本地配置文件，属于工作区外写入；必须明确授权后再执行。

## 适用范围

优先验收：

- Claude Code 本地 HTTP MCP 接入

暂不自动验收：

- Claude Desktop remote connector：`127.0.0.1` 本地服务不适合作为 Claude.ai / Desktop remote connector 直接配置目标。
- Claude Desktop DXT / local extension：后续可以单独做 DXT 包装；本文件先不要求。
- Claude Desktop `claude_desktop_config.json` stdio：可作为 fallback，但不是本仓库当前推荐主链。

## 官方依据

- Claude Code 官方文档说明可用 `claude mcp add --transport http <name> <url>` 添加 HTTP MCP server，并可用 `claude mcp list`、`claude mcp get` 和 `/mcp` 管理连接。
- Claude Code 官方文档说明 project scope 会写入项目级 MCP 配置，user/local scope 会写入 Claude 用户侧配置。
- MCP 官方架构说明中，Claude Code / Claude Desktop 是 MCP host，host 会为每个 MCP server 建立 MCP client。
- Anthropic Help Center 说明 remote MCP connector 从 Anthropic cloud 连接，而不是从本机连接；本地 MCP 配置是另一套机制。

参考：

- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)
- [MCP architecture overview](https://modelcontextprotocol.io/docs/learn/architecture)
- [Remote MCP connector network requirements](https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-integrations-using-remote-mcp)

## 本地预检

在不改 Claude 配置的前提下，可自动执行：

```powershell
cd A:\codex-memory
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
claude mcp list
npm run gate:mainline
```

当前预检结果：

| Check | Result |
|---|---|
| `Get-Command claude` | found: `C:\Users\617\.local\bin\claude.exe` |
| `claude` version | `2.1.100.0` |
| HTTP health | `ok=true`, `protocol=streamable-http`, path `/mcp/codex-memory` |
| `claude mcp list` | runnable; current list has no `vcp_codex_memory` |
| mainline gate | latest known `39/39 matched`, `39/39 rollback-ready` |

## 最小接入命令

需要明确授权后执行：

```powershell
cd A:\codex-memory
claude mcp add --transport http --scope local vcp_codex_memory http://127.0.0.1:7605/mcp/codex-memory
```

预期影响：

- 写入 Claude Code 的本地/用户 MCP 配置。
- 不修改仓库源码。
- 不修改 `.env`、provider key 或 Codex 配置。
- 不触发 provider 远端调用。

回滚命令：

```powershell
claude mcp remove vcp_codex_memory
```

## 最小验收步骤

1. 确认 HTTP MCP 存活：

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
```

2. 添加 Claude Code MCP server：

```powershell
claude mcp add --transport http --scope local vcp_codex_memory http://127.0.0.1:7605/mcp/codex-memory
```

3. 检查 Claude 配置中能看到该 server：

```powershell
claude mcp get vcp_codex_memory
claude mcp list
```

4. 在 Claude Code 内执行：

```text
/mcp
```

5. 通过 Claude 发起一次只读工具检查：

```text
请使用 vcp_codex_memory 的 memory_overview 查看当前记忆概览。
```

6. 回到仓库跑主线 gate：

```powershell
npm run gate:mainline
```

## 通过标准

本次最小验收通过需要同时满足：

- `claude mcp list` 显示 `vcp_codex_memory` connected。
- `/mcp` 面板显示 `vcp_codex_memory` 可用。
- Claude 能看到或调用 `record_memory` / `search_memory` / `memory_overview`。
- 至少一次只读 `memory_overview` 调用成功。
- `npm run gate:mainline` 仍通过：health `200`、compare `39/39 matched`、rollback `39/39 rollback-ready`。
- 没有写入 `.env`、provider key、Codex config、watchdog task 或远端系统。

## 失败判定

任一情况应判为未通过：

- `claude mcp add` 或 `claude mcp get` 失败。
- `/mcp` 中 server disconnected / failed。
- Claude 看不到 `memory_overview`。
- `memory_overview` 调用失败或返回协议错误。
- 接入后 `npm run gate:mainline` 失败。
- 需要暴露 secret 或改 `.env` 才能继续。

## 当前状态

`COMPLETED_UNVALIDATED` for actual Claude connection.

已完成：

- 本地 HTTP MCP 预检。
- Claude CLI 可用性检查。
- Claude MCP 当前列表只读检查。
- 验收命令、通过标准和回滚命令文档化。

未完成：

- 未执行 `claude mcp add`。
- 未修改 Claude 用户配置。
- 未在 Claude Code 中跑 `/mcp`。
- 未由 Claude 实际调用 `memory_overview`。

阻塞条件：

- 需要明确授权写入 Claude 配置。
