# Phase E Provider Benchmark

更新时间：2026-05-06

这份文档是 `Phase E / P2-2 provider / embedding / rerank 对照继续完善` 的轻量入口。

目标不是日常自动调用真实 provider，而是把 provider benchmark 的执行条件、留档位置和结果判断方式收成一个可复用流程。

## 适用场景

适合在这些情况下使用：

- embedding provider 或 rerank provider 配置发生变化
- 本地 `bge-m3-local`、远端 fallback 或 rerank provider 的表现需要横向比较
- embedding profile 迁移前后需要补一份 provider 侧证据
- 需要留存一次真实 provider benchmark 报告，供后续回看

不适合作为普通日常门禁自动执行。真实 provider 可能产生外部请求、额度消耗、速率限制或密钥暴露风险。

## 只读预检

优先确认当前本地状态和 profile 健康：

```powershell
cd A:\codex-memory
npm run profile-health
npm run profile-gate -- --json --summary-only
```

如果只是看默认主线是否健康，继续使用：

```powershell
npm run gate:mainline
```

## Provider Smoke

真实 provider 连通性检查入口：

```powershell
cd A:\codex-memory
npm run provider-smoke -- --json
```

配置样例：

- [provider-smoke.env.example](/A:/codex-memory/examples/provider-smoke.env.example)

执行前确认：

- API key 只存在本地环境变量或用户 profile
- 输出中没有真实 secret
- 本次调用允许访问对应外部 provider

## Provider Benchmark

基础 benchmark：

```powershell
cd A:\codex-memory
npm run provider-benchmark -- --json
```

指定 provider 对照：

```powershell
npm run provider-benchmark -- --providers local,bge-m3-local,nvidia --top-k 5 --json
```

配置样例：

- [provider-benchmark.env.example](/A:/codex-memory/examples/provider-benchmark.env.example)

详细说明：

- [benchmarks/provider-benchmark.md](/A:/codex-memory/benchmarks/provider-benchmark.md)

## 留档约定

CLI 报告默认进入：

```text
A:\codex-memory\benchmarks\reports\provider-benchmark-*.json
```

历史报告索引：

- [benchmarks/reports/README.md](/A:/codex-memory/benchmarks/reports/README.md)

记录模板：

- [phase-e-provider-benchmark-record-template.md](/A:/codex-memory/logs/phase-e-provider-benchmark-record-template.md)

建议每次真实 benchmark 后补一条简短记录，至少包括：

- 时间
- 本次 provider 列表
- 数据集路径
- 是否触达远端 provider
- report 文件名
- top1 / recallAtK / mrr 摘要
- latency 摘要
- 未验证项
- 是否影响默认主线判断

留档粒度：

- 本地 baseline、dry-run 型查看或纯文档核对：只记 `.agent_board/VALIDATION_LOG.md` 即可。
- 触达真实远端 provider、用于 profile 迁移判断、或将作为后续对照证据：复制记录模板生成一条正式 `logs/phase-e-provider-benchmark-*.md`。
- 如果 JSON 报告 `complete=false` 或 provider 被 `skipped`，正式记录里保留 blocker 原因，不把它写成全量通过。

## 禁止自动执行

没有明确授权时，不自动执行：

- 真实远端 `provider-smoke`
- 真实远端 `provider-benchmark`
- 写入真实 secret / `.env`
- `rebuild-profile -- --confirm`
- `rebuild-shadow`
- cleanup 非 dry-run

## 结果判断

provider benchmark 只说明 embedding provider 的检索差异，不等同于完整 recall 主链质量。

判读顺序：

1. 先看 JSON 顶层 `summary.ok` / `summary.complete` / `summary.message`。
2. 再看 `selectedProviders` 和 `dataset`，确认本次对照范围是否符合任务目标。
3. 再看各 provider 的 `status`、`metrics.top1`、`metrics.recallAtK`、`metrics.mrr` 和 latency。
4. 最后按需要抽查 query 级证据，例如 `queries[*].firstRelevantRank` 与 Top-K 候选。

最终主线判断仍以这些入口为准：

- `npm run gate:mainline`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`

provider benchmark 结果可以作为 profile/provider 迁移证据，但不能单独替代 compare / rollback / mainline gate。
