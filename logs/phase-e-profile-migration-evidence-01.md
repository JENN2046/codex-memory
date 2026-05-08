# Profile Migration Evidence — M-005

记录时间：2026-05-08

## 摘要

`codex-memory` 当前只有一个 embedding profile (`bge-m3-local__1024__v1`)，无 legacy chunks，无 baseline profile。当前不需要 profile migration。

## profile-health

- status: `ready`
- fingerprint: `bge-m3-local__1024__v1` (1024 dims)
- records: 442
- total chunks: 1255 (all current fingerprint)
- legacy chunks: 0
- vectors: 442
- diary vectors: 2
- embedding cache: 1200 entries
- candidate cache: 2 entries (current profile)
- SQLite: 30.6 MB, has `embeddingFingerprint` column

## rebuild-profile --dry-run

- mode: dry-run
- next action: `rebuild-profile --confirm` (需 Commander 授权)
- no legacy artifacts detected

## profile-gate

- status: `warn`
- reason: `baseline-missing` — 无其他 baseline profile 可比
- 10 queries tested against current profile, all returned results
- jaccard/overlap 不可比（baseline count=0）

## 结论

- 当前不需要 profile migration
- profile 处于健康发展状态
- 未来若切换 provider 或 dims，会自动创建新 fingerprint
- 届时需重新运行此证据收集并在新老 profile 间做 shadow-compare
