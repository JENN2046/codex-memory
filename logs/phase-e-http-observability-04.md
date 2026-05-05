# Phase E HTTP Observability 04

时间：2026-05-05 20:13:29 +08:00

## 目的

记录 `P0-2` 运行态复核时的 `npm run observe:http -- --json` 输出，补齐本轮主线可观察性基线。

## 适用上下文

- 仓库：`A:\\codex-memory`
- 分支：`main`
- 远端状态：`origin/main` 已同步到 `a7c96f9`
- 目的是观察主链 runtime 健康性与 recover 警告背景

## 已执行命令

- `npm run observe:http -- --json`

## 结果

- `summary.status`: `warn`
- `summary.message`: `HTTP MCP runtime is healthy but recent logs show recoverable anomalies.`
- `health`：
  - `healthStatus: ok`
  - `httpStatus: 200`
  - `name: vcp_codex_memory`
- `logs.http`：
  - `httpLogErrorCount: 0`
  - `watchdogRecoveryCount: 12`
  - `watchdogEnsureFailureCount: 0`
  - `listening: true`
  - `lastLine`: 最近一次监听日志正常
- `logs.watchdog`：
  - `recoveryCount: 12`
  - `duplicateCount: 0`
  - `ensureFailureCount: 0`
- `audits.write`
  - `recentCount: 5`
  - `decisionBreakdown: { accepted: 3, rejected: 2 }`
- `audits.recall`
  - `recentCount: 5`
  - `recallTypeBreakdown: { snippet: 5 }`
- `summary.hints`：
  - `watchdog 最近做过恢复，说明服务曾经掉过一次。`

## 结论

HTTP 主链 `health` 可达且 `httpStatus` 正常，但存在历史恢复路径（`watchdogRecoveryCount=12`）。本次判定为可运行，但需在长期趋势中关注重启频次是否持续上升。

## 未执行

- `npm run gate:mainline`
- `npm run gate:mainline:strict`

未执行原因：本次为只读运行态观测；主链功能面与 compare/rollback 未被触发。

## 下一步

- 持续追踪服务恢复频次；若恢复信号在短期抬高，优先补对应 watchdog/startup 的排障补充。
