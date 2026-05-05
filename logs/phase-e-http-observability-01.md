# Phase E HTTP Observability 01

时间：2026-05-05 12:20:33 +08:00

## 目的

这份记录用于验收 [PHASE_E_HTTP_OBSERVABILITY.md](/A:/codex-memory/PHASE_E_HTTP_OBSERVABILITY.md) 落地后的运行态排障路径。

## 执行命令

```powershell
npm run observe:http -- --json
npm run gate:mainline
```

## observe:http 结果

summary：

- `status: warn`
- `message: HTTP MCP runtime is healthy but recent logs show recoverable anomalies.`
- `healthStatus: ok`
- `httpLogErrorCount: 0`
- `watchdogRecoveryCount: 12`
- `watchdogEnsureFailureCount: 0`
- `bridgeRecentCount: 5`
- `recallRecentCount: 5`

health：

- URL：`http://127.0.0.1:7605/health`
- HTTP 状态：`200`
- service：`vcp_codex_memory`
- MCP path：`/mcp/codex-memory`

运行态判断：

- 当前 HTTP MCP health 正常。
- `warn` 来自 watchdog 历史恢复记录，不是当前 health 失败。
- HTTP log 最近 tail 中 `errorCount = 0`。
- bridge audit 和 recall audit 都有 recent entries。

## gate:mainline 结果

- `status: ok`
- `mode: daily`
- health：`200`
- compare：`34/34 matched`
- rollback：`34/34 rollback-ready`

## 未执行

- `npm run gate:mainline:strict`
- `npm run observe:http` 文本模式
- 单独 compare / rollback CLI

原因：本次目标是验收 P0-2 运行态观察入口和排障顺序，不是严格门禁或 donor 兼容细分排查。

## 结论

`Phase E / P0-2` 的最小运行态排障入口已完成一次实跑验收：`observe:http` 能区分“health 正常但 watchdog 历史有恢复记录”的 warn 状态，`gate:mainline` 同时确认默认主链 compare / rollback 仍然全绿。

## 下一步

如果后续继续做 `P0-3 回滚流程再收紧一层`，从 [PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md) 的对应条目继续。
