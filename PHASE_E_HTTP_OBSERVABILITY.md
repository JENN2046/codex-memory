# Phase E HTTP Observability

更新时间：2026-05-05

这份文档是 `Phase E / P0-2 HTTP MCP 运行态可观测性再补一层` 的日常排障入口。

目标：当默认 HTTP MCP 主链“看起来健康，但实际不好用”时，能快速知道先看 health、日志、bridge audit 还是 recall audit。

## 先跑什么

```powershell
cd A:\codex-memory
npm run observe:http -- --json
```

如果只是人眼快速看，也可以跑文本模式：

```powershell
npm run observe:http
```

常用参数：

- `--json`
- `--health-url <url>`
- `--tail <lines>`
- `--audit-tail <entries>`

## 看 summary

先看 `summary.status`：

- `ok`：HTTP MCP 健康，最近日志和 audit 没看到明显异常。
- `warn`：HTTP MCP 当前健康，但最近日志里出现过恢复、错误或其它可疑信号。
- `error`：`/health` 未通过，先处理服务可达性。

再看 `summary.hints`。它是这条命令给出的最短下一步，不要先从长日志里硬翻。

## 排障顺序

1. `health`
   - 看 `health.status`、`health.httpStatus`、`health.error`。
   - 如果不是 `ok`，先跑 `npm run start:http:ensure`，再重跑 `npm run observe:http -- --json`。
2. `logs.http`
   - 看 `errorCount`、`listening`、`lastLine`。
   - 如果 HTTP 日志有 `ERROR`，先定位启动、端口、handler 或进程异常。
3. `logs.watchdog`
   - 看 `recoveryCount`、`ensureFailureCount`、`duplicateCount`。
   - 如果 watchdog 最近恢复过服务，说明用户感知问题可能发生在恢复前后。
4. `audits.write`
   - 排查 `record_memory` 时看这里。
   - 重点看 `recentCount`、`decisionBreakdown`、`lastAcceptedAt`、`lastRejectedAt`。
5. `audits.recall`
   - 排查 `search_memory`、被动召回或“搜不到”时看这里。
   - 重点看 `recentCount`、`recallTypeBreakdown`、`lastRecallAt`、`resultCount`。

## 常见判断

`summary.status=error`：

- 当前 HTTP MCP 不健康。
- 先执行 `npm run start:http:ensure`。
- 不要先改 Codex 配置或回滚配置。

`summary.status=warn` 且 `watchdogRecoveryCount > 0`：

- 服务当前可达，但最近发生过恢复。
- 先看 watchdog 和 HTTP 日志的时间线。
- 如果恢复频繁，再考虑 watchdog / startup 方向排查。

`health=ok` 但 `audits.write.recentCount=0`：

- 如果问题是“写记忆没有反应”，优先核对 `record_memory` 调用是否真的到达 bridge。
- 这不一定是 HTTP 服务故障。

`health=ok` 但 `audits.recall.recentCount=0`：

- 如果问题是“召回没有反应”，优先核对 `search_memory` 或被动召回入口是否真的被调用。
- 这也不一定是 HTTP 服务故障。

compare / rollback 相关怀疑：

```powershell
npm run gate:mainline
```

如果触达 MCP 契约、HTTP 启动链或 active-memory 行为：

```powershell
npm run gate:mainline:strict
```

## 不要在排障第一步做什么

这些不是运行态观察的第一步：

- 不要直接改 `C:\Users\617\.codex\config.toml`
- 不要直接执行 `rebuild-shadow`
- 不要直接执行 `rebuild-profile -- --confirm`
- 不要直接执行 cleanup `--confirm`
- 不要直接安装 watchdog 或启动项

先用 `observe:http` 和 gate 确认问题属于哪一层。

## 当前 CLI 覆盖

`npm run observe:http` 当前会汇总：

- HTTP `/health`
- HTTP log
- watchdog log
- bridge write audit
- recall audit

对应源码：[src/cli/http-observe.js](/A:/codex-memory/src/cli/http-observe.js)

对应测试：[tests/http-observe-cli.test.js](/A:/codex-memory/tests/http-observe-cli.test.js)

## 验收口径

`P0-2` 的最小验收口径：

- 不需要重新从 README 各处拼运行态排障线索。
- 能明确区分 health、HTTP log、watchdog log、bridge audit、recall audit 各自负责的问题。
- 能知道什么时候只跑 `observe:http`，什么时候升级到 `gate:mainline` 或 `gate:mainline:strict`。

## 一句话结论

HTTP MCP 运行态排障先跑 `npm run observe:http -- --json`；按 `health -> http log -> watchdog log -> bridge audit -> recall audit` 缩小范围，再决定是否启动服务、跑 gate 或升级严格门禁。
