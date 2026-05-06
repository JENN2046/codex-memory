# Provider Benchmark Reports

更新时间：2026-05-06

这个目录用于留存 `provider-benchmark` 的 JSON 报告。

这些报告是 provider / embedding 对照的现场材料，不是默认主线是否可用的最终判断。默认主线仍以 `gate:mainline`、active-memory compare 和 rollback readiness 为准。

## 当前已留存报告

| Report | Generated at | Providers | Summary |
|---|---|---|---|
| [provider-benchmark-20260422-201441.json](/A:/codex-memory/benchmarks/reports/provider-benchmark-20260422-201441.json) | 2026-04-22 12:14:41Z | `local,bge-m3-local,cohere,voyage,jina` | incomplete: `bge-m3-local, cohere, voyage, jina` |
| [provider-benchmark-20260422-201718-nvidia-via-bge-slot.json](/A:/codex-memory/benchmarks/reports/provider-benchmark-20260422-201718-nvidia-via-bge-slot.json) | 2026-04-22 12:17:21Z | `local,bge-m3-local` | incomplete: `bge-m3-local` |
| [provider-benchmark-20260422-201847-full.json](/A:/codex-memory/benchmarks/reports/provider-benchmark-20260422-201847-full.json) | 2026-04-22 12:18:57Z | `local,bge-m3-local,nvidia,cohere,voyage,jina` | incomplete: `bge-m3-local, cohere, voyage, jina` |

## 留档规则

新增真实 provider benchmark 报告时：

- 文件名继续使用 `provider-benchmark-YYYYMMDD-HHMMSS*.json`
- 不提交真实 API key、原始 `.env`、授权 header 或 provider secret
- 如果报告触达远端 provider，在配套记录中说明 provider 列表和数据集路径
- 如果 provider 被 `skipped` 或报告 `complete=false`，在摘要里保留 blocker 原因
- 不把 provider benchmark 结果当作 mainline gate 的替代品

## 读取顺序

1. 先看 JSON 顶层 `summary`。
2. 再看 `selectedProviders` 和 `dataset`，确认对照范围是否符合预期。
3. 再看各 provider 的 `status`、`metrics` 和 `latency`。
4. 最后按需要抽查 `queries[*].firstRelevantRank` 和 Top-K 候选。

## 相关入口

- [Phase E Provider Benchmark](/A:/codex-memory/PHASE_E_PROVIDER_BENCHMARK.md)
- [Provider Benchmark CLI](/A:/codex-memory/benchmarks/provider-benchmark.md)
- [provider-benchmark.env.example](/A:/codex-memory/examples/provider-benchmark.env.example)
