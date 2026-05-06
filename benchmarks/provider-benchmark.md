# Provider Benchmark

`provider-benchmark` 用来做纯 embedding 检索基准对比，目标是把本地 `local-hash`、本地部署的 `bge-m3-local`，以及远端 `Cohere / Voyage / Jina` 的召回差异放到同一份报告里。

这个 CLI 刻意绕开了完整 recall 主链，只比较：

- document embedding
- query embedding
- cosine similarity 排序

这样可以把差异尽量收敛到 embedding provider 本身，而不是被 `TagMemo`、时间过滤、group、rerank 或 context vector 混进去。

## 快速开始

```powershell
cd A:\codex-memory
npm run provider-benchmark -- --providers local,cohere,voyage,jina --json
```

如果你要先比较本地 `bge-m3-local`：

```powershell
npm run provider-benchmark -- --providers local,bge-m3-local --json
```

如果你只想先看本地 baseline：

```powershell
npm run provider-benchmark -- --json
```

## 数据集

默认数据集在：

- [default-dataset.json](A:\codex-memory\benchmarks\default-dataset.json)

也可以自定义：

```powershell
node .\src\cli\provider-benchmark.js --dataset A:\path\to\dataset.json --json
```

或者：

```powershell
$env:CODEX_MEMORY_BENCH_DATASET='A:\path\to\dataset.json'
npm run provider-benchmark -- --json
```

数据集格式：

```json
{
  "name": "my-benchmark",
  "documents": [
    { "id": "doc-1", "text": "..." }
  ],
  "queries": [
    { "id": "q-1", "query": "...", "relevant": ["doc-1"] }
  ]
}
```

## 环境变量

参考样例：

- [provider-benchmark.env.example](A:\codex-memory\examples\provider-benchmark.env.example)

主要变量：

- `CODEX_MEMORY_BENCH_BGE_M3_LOCAL_EMBEDDING_URL`
- `CODEX_MEMORY_BENCH_BGE_M3_LOCAL_EMBEDDING_MODEL`
- `CODEX_MEMORY_BENCH_COHERE_EMBEDDING_API_KEY`
- `CODEX_MEMORY_BENCH_COHERE_EMBEDDING_MODEL`
- `CODEX_MEMORY_BENCH_VOYAGE_EMBEDDING_API_KEY`
- `CODEX_MEMORY_BENCH_VOYAGE_EMBEDDING_MODEL`
- `CODEX_MEMORY_BENCH_JINA_EMBEDDING_API_KEY`
- `CODEX_MEMORY_BENCH_JINA_EMBEDDING_MODEL`
- `CODEX_MEMORY_BENCH_LOCAL_EMBED_DIMS`

## 输出

JSON 报告会包含：

- `summary`
- `providers.local`
- `providers.bge-m3-local`
- `providers.cohere`
- `providers.voyage`
- `providers.jina`
- `deltas.<provider>`

每个 provider 会返回：

- `metrics.top1Accuracy`
- `metrics.recallAt3`
- `metrics.recallAt5`
- `metrics.recallAtK`
- `metrics.mrr`
- `latency.averageQueryLatencyMs`
- `queries[*].firstRelevantRank`

报告留档目录：

- [reports/README.md](/A:/codex-memory/benchmarks/reports/README.md)

## 注意事项

- 如果显式要求了远端 provider，但没有配置 key，CLI 会把该 provider 标成 `skipped` 并返回非零退出码。
- 当前基准是“纯 embedding 检索对比”，不是最终端到端 recall 质量总分。
- 如果要比较真实线上效果，建议对你自己的 process / knowledge 数据额外准备一份领域数据集。
