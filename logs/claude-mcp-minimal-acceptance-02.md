# Claude MCP Minimal Acceptance 02

时间：2026-05-06

## 目标

执行授权后的 Claude MCP 本地配置写入，并验证 `vcp_codex_memory` 是否能被 Claude Code 识别。

## 已执行

```powershell
claude mcp add --transport http --scope local vcp_codex_memory http://127.0.0.1:7605/mcp/codex-memory
claude mcp get vcp_codex_memory
claude mcp list
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
```

## 结果

| Check | Result |
|---|---|
| `claude mcp add` | succeeded |
| Modified file | `C:\Users\617\.claude.json` for project `A:\codex-memory` |
| `claude mcp get vcp_codex_memory` | `Status: Connected`, type `http`, URL `http://127.0.0.1:7605/mcp/codex-memory` |
| `claude mcp list` | `vcp_codex_memory` listed and connected |
| HTTP health | `ok=true`, `name=vcp_codex_memory`, `protocol=streamable-http`, path `/mcp/codex-memory` |

## `/mcp` Check

Attempted non-interactive command:

```powershell
claude -p "/mcp" --output-format json --max-budget-usd 0.20
```

Result:

```text
Unknown skill: mcp
```

Interpretation:

- `/mcp` is an interactive Claude Code slash command and did not run in `-p` print mode.
- The automated equivalent checks, `claude mcp get` and `claude mcp list`, both show `vcp_codex_memory` connected.
- Manual interactive `/mcp` remains not validated.

## `memory_overview` Check

Attempted model-mediated tool call before the user specified `deepseek-v4-pro`:

```powershell
claude -p "请调用 vcp_codex_memory 的 memory_overview 工具查看当前记忆概览。只调用这个 MCP 工具，不要调用其他工具；最后用一句话概括是否调用成功。" --allowedTools mcp__vcp_codex_memory__memory_overview --output-format json --max-budget-usd 0.50
```

Result:

```text
API Error: Unable to connect to API (ConnectionRefused)
```

Interpretation:

- Claude Code MCP configuration is connected.
- The model-mediated tool call did not reach execution because API connectivity failed before the tool call.
- This is not evidence of a `codex-memory` MCP server failure.

Direct MCP protocol probe against the configured endpoint was run to isolate server behavior:

```text
initialize -> tools/list -> tools/call memory_overview
```

Result:

| Field | Value |
|---|---|
| sessionCreated | `true` |
| serverName | `vcp_codex_memory` |
| protocolVersion | `2025-06-18` |
| toolNames | `record_memory,search_memory,memory_overview` |
| overviewIsError | `false` |
| shadowSyncAvailable | `true` |

## Mainline Gate

```powershell
npm run gate:mainline
```

Result:

- health `200`
- compare `39/39 matched`
- rollback `39/39 rollback-ready`

## Status

`PARTIAL`

Passed:

- Claude local MCP config written.
- Claude Code reports `vcp_codex_memory` connected.
- HTTP MCP endpoint is healthy.
- Direct MCP protocol `memory_overview` call succeeded.
- Mainline gate remains green.

Not passed:

- Non-interactive `/mcp` did not run because `/mcp` is interactive-only.
- Model-mediated `memory_overview` call failed at API connection layer with `ConnectionRefused`.

## Next

Use `deepseek-v4-pro` for the model-mediated retry, then open an interactive Claude Code session in `A:\codex-memory`, run `/mcp`, and ask the model to call `memory_overview` once after API connectivity is healthy.
