# Claude MCP Minimal Acceptance 05

日期：2026-05-06

## 目的

按用户批准，将 Claude Code 侧模型从历史验收使用的 `deepseek-v4-pro` 切换为 `deepseek-ai/deepseek-v4-flash`，并补一次只读模型侧验收。

## 范围

- 只读 Claude CLI 调用。
- 只读 MCP `memory_overview` 调用。
- 不修改 Claude 配置。
- 不修改 `.env`、provider key、Codex config、watchdog task 或远端系统。
- 不执行 `git push`。

## 命令

```powershell
claude -p "只输出 OK" --model deepseek-ai/deepseek-v4-flash --output-format json --max-budget-usd 0.10
```

结果：`COMPLETED_VALIDATED`，模型名可用，返回 `OK`。

```powershell
claude -p "<read-only repository capability assessment>" --model deepseek-ai/deepseek-v4-flash --allowedTools Read --output-format json --max-turns 8 --max-budget-usd 0.50
```

结果：`COMPLETED_VALIDATED`，只读能力评估成功返回。

备注：第一次更宽的只读评估在 120 秒超时后留下 `.omc/state/last-tool-error.json`，内容为 Claude/OMC 运行态工具错误记录；该目录已作为本地工具状态加入 `.gitignore`。

```powershell
claude -p "请调用 vcp_codex_memory 的 memory_overview 工具查看当前记忆概览。只调用这个 MCP 工具，不要调用其他工具；最后明确输出：memory_overview 调用成功或失败。" --model deepseek-ai/deepseek-v4-flash --allowedTools mcp__vcp_codex_memory__memory_overview --output-format stream-json --verbose --max-budget-usd 0.50
```

结果：`COMPLETED_VALIDATED`，输出明确包含 `memory_overview 调用成功`。

```powershell
npm run gate:mainline
```

结果：`COMPLETED_VALIDATED`。

- health `200`
- compare `39/39 matched`
- rollback `39/39 rollback-ready`

## 结论

`deepseek-ai/deepseek-v4-flash` 可作为当前 Claude Code 侧的模型侧验收模型，且已完成：

- CLI 模型 smoke
- 只读仓库能力评估
- MCP `memory_overview` 只读工具调用
- 推后无关的本地主线 gate 复核

历史 `deepseek-v4-pro` 验收记录仍保留为历史证据；后续 Claude Code 侧模型调用默认使用 `deepseek-ai/deepseek-v4-flash`，除非用户另行指定。

## 未完成

- 交互式 Claude Code `/mcp` 面板仍未实跑；非交互 `claude -p "/mcp"` 已知不可替代该面板。
