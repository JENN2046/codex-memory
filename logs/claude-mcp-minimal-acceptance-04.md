# Claude MCP Minimal Acceptance 04

时间：2026-05-06

## 目标

重跑同一条模型侧 `memory_overview` 验收，并按用户要求使用 `deepseek-v4-pro`。

## 已执行

第一次重跑：

```powershell
claude -p "请调用 vcp_codex_memory 的 memory_overview 工具查看当前记忆概览。只调用这个 MCP 工具，不要调用其他工具；最后用一句话概括是否调用成功。" --model deepseek-v4-pro --allowedTools mcp__vcp_codex_memory__memory_overview --output-format json --max-budget-usd 0.50
```

结果：

- command exit code: `0`
- `is_error=false`
- model: `deepseek-v4-pro`
- final text was empty, so a verbose rerun was needed to prove tool execution.

Verbose rerun:

```powershell
claude -p "请调用 vcp_codex_memory 的 memory_overview 工具查看当前记忆概览。只调用这个 MCP 工具，不要调用其他工具；最后明确输出：memory_overview 调用成功或失败。" --model deepseek-v4-pro --allowedTools mcp__vcp_codex_memory__memory_overview --output-format stream-json --verbose --max-budget-usd 0.50
```

## 结果

`COMPLETED_VALIDATED`

Evidence:

- model: `deepseek-v4-pro`
- tool allowlist: `mcp__vcp_codex_memory__memory_overview`
- final result included: `memory_overview 调用成功`
- no permission denial
- command exit code: `0`

Key returned summary:

| Field | Value |
|---|---|
| sample size | `50` |
| accepted | `37` |
| rejected | `13` |
| accepted process memories | `18` |
| accepted knowledge memories | `19` |
| rejected process memories | `4` |
| rejected knowledge memories | `9` |
| sensitive rejections | `9` |
| latest accepted at | `2026-05-05T09:30:46Z` |
| embedding profile | `bge-m3-local__1024__v1` |

## Notes

- This validates the model-mediated `memory_overview` path using `deepseek-v4-pro`.
- Non-interactive `/mcp` still does not run as a slash command in `claude -p`; use `claude mcp get/list` as the automated status check or run `/mcp` manually in an interactive Claude Code session.
