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

如果只是本地 baseline 或 dry-run 型查看，可以只记在 `.agent_board/VALIDATION_LOG.md`，不必新增独立日志。

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

最终主线判断仍以这些入口为准：

- `npm run gate:mainline`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`

provider benchmark 结果可以作为 profile/provider 迁移证据，但不能单独替代 compare / rollback / mainline gate。
