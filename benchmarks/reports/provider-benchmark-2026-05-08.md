# Provider Benchmark — 2026-05-08

## 摘要

| 指标 | local (baseline) | bge-m3-local | nvidia |
|------|-----------------|-------------|--------|
| status | ok | ok | error |
| model | local-hash | bge-m3-local | baai/bge-m3 |
| dims | 1024 | 1024 | 1024 |
| top1Accuracy | 1.0 | 1.0 | — |
| recall@K | 1.0 | 1.0 | — |
| MRR | 1.0 | 1.0 | — |
| avg query latency | 0.055 ms | 85.6 ms | — |
| total benchmark | 4.6 ms | 684.5 ms | — |

**bge-m3-local** 在所有 8 个查询上与 local hash baseline 完全一致（所有 delta=0）。本地 bge-m3 模型产生与 hash embedding 相同的检索排名。

**nvidia** API 返回 500 错误，不可用。

## 结论

- 当前 local-hash 和 bge-m3-local 检索质量无差异
- bge-m3-local 延迟显著高于 local-hash（85ms vs 0.055ms per query），但仍在可接受范围
- 当前无需切换 embedding provider
- nvidia 端点需在后续检查 API key 和 endpoint 状态

## 原始数据

[JSON 记录](./provider-benchmark-2026-05-08.json)
