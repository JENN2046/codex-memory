# Phase E HTTP Observability 02

时间：2026-05-05 13:22:59 +08:00

## 目的

本次记录用于补一次最新 `observe:http -- --json` 运行态快照，作为 P1-2 收口后的完整收口素材。

## 执行命令

```powershell
npm run observe:http -- --json
```

## 结论

`summary.status = warn`，原因是历史日志里仍有恢复迹象，但核心指标健康，未出现错误告警。

## 关键字段

- `health.url`: `http://127.0.0.1:7605/health`
- `health.httpStatus`: `200`
- `health.status`: `ok`
- `summary.httpLogErrorCount`: `0`
- `summary.watchdogRecoveryCount`: `12`
- `summary.watchdogEnsureFailureCount`: `0`
- `summary.bridgeRecentCount`: `5`
- `summary.recallRecentCount`: `5`

## 运行摘要

- HTTP 日志：`listening=true`，`errorCount=0`
- watchdog 日志：`recoveryCount=12`，`ensureFailureCount=0`
- bridge 审计最近 5 条中：`accepted=3`、`rejected=2`
- recall 审计最近 5 条中：`snippet=5`

## 备注

该快照与 `status: warn` 一致，提示近期服务有过自愈恢复但未进入 `error` 状态；结合当期 `gate:mainline: ok`，可判定主线可运行且可回归。
