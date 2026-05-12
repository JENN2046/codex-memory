# Memory Dashboard — Report Design

更新时间：2026-05-12

## 目的

这是 Phase J-001 设计成果。定义 `memory-dashboard` CLI 的只读报告形状，汇总当前所有观测数据源：

- HTTP 服务健康
- 记忆存储概况（records、chunks、vectors）
- 运行态日志诊断
- Bridge audit（写入审计）
- Recall audit（检索审计）
- Governance summary（proposal / tombstone / supersession / stale）
- Profile 健康
- 门禁状态（compare / rollback）

当前仓库已实现 dashboard / `http-observe` 的基础观测面；本文件保留 schema 作为当前实现与后续只读扩展的对照。

## 1. 输出模式

| 模式 | 标志 | 用途 |
|------|------|------|
| 文本摘要 | 默认（无 --json） | 人类可读，排障 |
| JSON 全量 | `--json` | 自动化、CI |
| JSON 摘要 | `--json --summary-only` | 轻量检查 |

## 2. JSON Output Schema

```json
{
  "generatedAt": "<ISO 8601>",
  "mode": "memory-dashboard",
  "destructive": false,
  "summary": {
    "status": "ok | warn | error",
    "message": "<一句话摘要>"
  },
  "service": {
    "status": "ok | warn | error",
    "url": "http://127.0.0.1:7605/health",
    "httpStatus": 200,
    "name": "vcp_codex_memory",
    "version": "0.1.0",
    "protocol": "streamable-http",
    "uptimeSince": "<启动时间>"
  },
  "store": {
    "status": "ok | warn | error",
    "records": 428,
    "chunks": 1255,
    "vectors": 442,
    "diaryVectors": 2,
    "targets": ["knowledge", "process"],
    "sensitivityBreakdown": {
      "internal": 400,
      "private": 28
    },
    "ageBreakdown": {
      "last24h": 0,
      "last7d": 3,
      "last30d": 428,
      "older30d": 0
    }
  },
  "profile": {
    "status": "ok | warn | error",
    "fingerprint": "bge-m3-local__1024__v1",
    "dimensions": 1024,
    "provider": "bge-m3-local",
    "legacyChunks": 0,
    "embeddingCacheEntries": 1200,
    "candidateCacheEntries": 2
  },
  "runtime": {
    "status": "ok | warn | error",
    "httpLogErrorCount": 0,
    "watchdogRecoveryCount": 12,
    "watchdogEnsureFailureCount": 0,
    "lastWatchdogEvent": "<ISO 8601>"
  },
  "audits": {
    "bridge": {
      "status": "ok | warn | error",
      "recentCount": 5,
      "acceptedCount": 3,
      "rejectedCount": 2,
      "lastAcceptedAt": "<ISO 8601>",
      "lastRejectedAt": "<ISO 8601>"
    },
    "recall": {
      "status": "ok | warn | error",
      "recentCount": 5,
      "recallTypeBreakdown": { "snippet": 5 },
      "lastRecallAt": "<ISO 8601>"
    }
  },
  "governance": {
    "status": "ok | warn | error",
    "reviewLevel": "nominal | observe | needs-review | unavailable",
    "message": "<一句话摘要>",
    "counts": {
      "totalRecords": 428,
      "proposalCount": 2,
      "tombstonedCount": 8,
      "supersededCount": 13,
      "supersessionInitiated": 9,
      "stale30d": 11,
      "stale90d": 3
    },
    "statusDistribution": {
      "active": 405,
      "proposal": 2,
      "tombstoned": 8
    },
    "retention": {
      "retain": 420,
      "review": 8
    },
    "hints": [
      "2 条 proposal 仍待人工审查。",
      "3 条 active memory 超过 90 天未更新，建议优先做治理复核。"
    ]
  },
  "gate": {
    "status": "ok | warn | error",
    "compare": {
      "totalCases": 43,
      "matchedCases": 43,
      "coreMismatch": 0,
      "extendedMismatch": 0
    },
    "rollback": {
      "totalCases": 43,
      "readyCases": 43,
      "coreMismatch": 0,
      "extendedMismatch": 0
    },
    "tests": {
      "total": 123,
      "passed": 123,
      "failed": 0
    }
  },
  "checks": [
    {
      "source": "<数据源名称>",
      "level": "ok | warn | error",
      "code": "<检查码>",
      "message": "<人类可读消息>"
    }
  ],
  "recommendations": [
    "<可操作建议>"
  ]
}
```

## 3. Summary Status 综合判断

```text
ok    所有数据源 ok，无异常
warn  至少一个数据源 warn，无 error
error 至少一个数据源 error
```

## 4. 检查项清单

| 数据源 | 检查码 | ok条件 | warn条件 | error条件 |
|--------|--------|--------|---------|----------|
| service | `health-reachable` | httpStatus=200 | — | unreachable |
| store | `store-records-positive` | records > 0 | — | records = 0 |
| store | `store-freshness` | last24h > 0 | last7d > 0 | last7d = 0 |
| profile | `profile-ready` | status=ready | legacyChunks > 0 | fingerprint missing |
| runtime | `http-log-clean` | errorCount = 0 | — | errorCount > 0 |
| runtime | `watchdog-stable` | recoveryCount = 0 | recoveryCount ≤ 5 | recoveryCount > 20 |
| audits | `bridge-recent` | recentCount > 0 | — | lastAcceptedAt > 7d |
| audits | `recall-recent` | recentCount > 0 | — | lastRecallAt > 7d |
| governance | `governance-snapshot` | snapshot 可读，且无待处理信号 | snapshot 可读但有 review 信号 | snapshot 不可读 |
| governance | `governance-proposals` | proposalCount = 0 | proposalCount > 0 | — |
| governance | `governance-stale-active` | stale30d = 0 且 stale90d = 0 | stale30d > 0 或 stale90d > 0 | — |
| gate | `compare-clean` | matchedAll=true, drift=0 | extendedMismatch > 0 | coreMismatch > 0 |
| gate | `rollback-ready` | rollbackReady=true | — | coreMismatch > 0 |
| gate | `tests-pass` | failed=0 | — | failed > 0 |

## 5. 文本输出格式

```text
Memory Dashboard — 2026-05-08T04:30:00.000Z
─────────────────────────────────────────────

Service    ok   http://127.0.0.1:7605/health  200  v0.1.0
Store      ok   428 records, 1255 chunks, 442 vectors
Profile    ok   bge-m3-local__1024__v1, 0 legacy
Runtime    warn watchdog recovered 12 times, no HTTP errors
Bridge     ok   5 recent, 3 accepted, 2 rejected
Recall     ok   5 recent (all snippet)
Governance warn 2 proposals, 3 stale>90d, review needs-review
Gate       ok   compare 43/43, rollback 43/43, tests 123/123

Checks:
  ok   health-reachable        HTTP /health responded 200
  ok   store-records-positive  428 memory records in store
 warn  store-freshness         No records written in last 24h
  ok   profile-ready           bge-m3-local fingerprint ready
  ok   http-log-clean          No HTTP errors in log
 warn  watchdog-stable         Watchdog recovered 12 times
 warn  governance-proposals    2 proposals pending review
 warn  governance-stale-active 11 active records stale >30d, 3 stale >90d
  ok   compare-clean           43/43 matched, 0 drift
  ok   rollback-ready          43/43 rollback-ready
  ok   tests-pass              123/123 passed

Recommendations:
  - Watchdog has recovered 12 times; consider investigating root cause of service instability
  - No new memory written in 24h; this may be expected during maintenance
  - 2 governance proposals are pending review
  - 3 active memories are stale >90d — schedule governance review
```

## 6. CLI 入口

```text
npm run dashboard        完整文本报告
npm run dashboard -- --json             JSON 全量
npm run dashboard -- --json --summary-only  JSON 摘要
```

## 7. 数据采集策略

所有数据源由现有工具提供，dashboard 只做聚合，不重复实现采集逻辑：

| 数据源 | 调用方式 |
|--------|---------|
| health | HTTP GET `/health` |
| store | MCP `memory_overview` 或直接读 SQLite |
| profile | `npm run profile-health -- --json` |
| runtime logs | 读 `logs/codex-memory-http.log` + `logs/codex-memory-http-watchdog.log` |
| bridge audit | 读 `logs/codex-memory-bridge.jsonl` 尾部 |
| recall audit | 读 `logs/codex-memory-recall.jsonl` 尾部 |
| governance | 复用 `governance:report` 的只读 SQLite 汇总 |
| gate | `npm run gate:mainline -- --json` |
| tests | `npm test` 结果（可选，昂贵操作） |

## 7.1 当前治理边界

- governance summary 只做只读聚合与提示分级
- 不写 proposal / tombstone / supersession
- 不扩展 MCP contract
- 不输出 raw `workspace_id`
- dashboard / `http-observe` 只暴露低风险 count / status / hint

## 8. 后续步骤

| Step | 内容 | 类型 |
|------|------|------|
| J-001 | 本文件 — dashboard 设计 | docs |
| J-002 | 实现 `src/cli/dashboard.js` + `npm run dashboard` | runtime |
| J-003 | 本地 Web UI 评估（仅评估，不实现） | docs |

## 9. 不做

- Web UI 实现（Phase J 只评估不实现）
- 实时 push-based 通知（poll-based CLI 足够）
- 历史 dashboard 快照自动保存（用户可手动重定向到文件）
- 跨进程 dashboard（dashboard 在同一进程内采集，不依赖外部 agent）
