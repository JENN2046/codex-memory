# Phase E HTTP Observability 03

时间：2026-05-05 13:23:31 +08:00

## 目的

本次记录用于新增一条最新 `observe:http -- --json` 运行态快照，补齐 Phase E 收口证据链。

## 执行命令

```powershell
npm run observe:http -- --json
```

## 结论

`summary.status = warn`，核心链路仍健康、可达，但最近出现过可恢复性重启，属于“可运行但有抖动历史”的告警级别。

## 关键字段

- `summary.status`: `warn`
- `summary.message`: `HTTP MCP runtime is healthy but recent logs show recoverable anomalies.`
- `health.status`: `ok`
- `health.httpStatus`: `200`
- `health.url`: `http://127.0.0.1:7605/health`
- `summary.httpLogErrorCount`: `0`
- `summary.watchdogRecoveryCount`: `12`
- `summary.watchdogEnsureFailureCount`: `0`
- `summary.bridgeRecentCount`: `5`
- `summary.recallRecentCount`: `5`
- `audits.write.recent.entries`: 5（`accepted`=3，`rejected`=2）
- `audits.recall.recent.entries`: 5（全部为 `snippet`）

## 运行摘要

- HTTP 侧：`listening=true`，`errorCount=0`，`infoCount=20`，服务监听行稳定在
  `http://127.0.0.1:7605/mcp/codex-memory`。
- Watchdog 侧：`recoveryCount=12`，`ensureFailureCount=0`，近似最近 5 分钟无失败重试迹象。
- `summary.hints`: `watchdog 最近做过恢复，说明服务曾经掉过一次。`

## 下一步建议

- 主链继续可运行（本地链路在 `ok`）；若后续出现偶发不可达，优先用 `npm run start:http:ensure` 再复跑 `observe:http -- --json`。

