# Claude MCP Minimal Acceptance 03

时间：2026-05-06

## 目标

按用户指示，不使用 Claude 模型，改用 `deepseek-v4-pro` 尝试模型侧 `memory_overview` 实机验收。

## 已执行

```powershell
claude -p "请调用 vcp_codex_memory 的 memory_overview 工具查看当前记忆概览。只调用这个 MCP 工具，不要调用其他工具；最后用一句话概括是否调用成功。" --model deepseek-v4-pro --allowedTools mcp__vcp_codex_memory__memory_overview --output-format json --max-budget-usd 0.50
```

## 结果

```text
API Error: Unable to connect to API (ConnectionRefused)
```

## 判定

`PARTIAL`

已确认：

- `vcp_codex_memory` 已写入 Claude Code local MCP 配置。
- `claude mcp get/list` 已显示 connected。
- 直接 MCP 协议 `tools/call memory_overview` 已成功。
- 使用 `--model deepseek-v4-pro` 后，模型侧调用仍未执行到工具层。

未完成：

- `deepseek-v4-pro` 模型侧未能实际触发 `memory_overview`。

阻塞：

- Claude Code 到所选模型提供方的 API 连接失败：`ConnectionRefused`。

## 下一步

等模型 API connectivity 正常后，继续使用 `--model deepseek-v4-pro` 重跑同一条 `memory_overview` 验收命令。
