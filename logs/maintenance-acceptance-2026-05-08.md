# 维护期验收快照 — 2026-05-08

基底 commit：`61b6279` / tag：`v0.1.0-maint-20260508`

## gate:ci

```
ok   compare   43/43 matched, 0/0 core/extended
ok   rollback  43/43 ready, 0/0
ok   tests     119/119 passed (15 CI-safe files)
ok   docs      29 scripts, all targets exist
Result: PASS
```

## gate:mainline

```
health   200  vcp_codex_memory  v0.1.0
compare  43/43 matched, 0 core, 0 extended
rollback 43/43 rollback-ready, 0/0
Result: PASS
```

## dashboard --json --summary-only

```
status: warn
  service  ok   200
  store    ok   442 records, 1255 chunks
  profile  warn fingerprint bge-m3-local__1024__v1
  runtime  ok   0 HTTP errors, 17 watchdog recoveries
  audits   ok   5 bridge, 5 recall
  gate     ok   43/43 compare, 43/43 rollback
warnings:
  - watchdog recovered 17 times
  - profile not ready (see profile-health)
```

## profile-health

```
status: needs-attention
  records:            442
  chunks:             1255 (0 legacy)
  vectors:            0 ← 需 rebuild-shadow
  diaryVectors:       1
  embeddingCache:     82
  candidateCache:     5
warnings:
  - vector-index-empty: 当前 vector index 无 record vectors
recommendation: npm run rebuild-shadow
```

## 备注

- provider benchmark、profile confirm、cleanup apply 未执行（需单独授权）
- vector index 为空可能是本批测试活动所致，不影响 compare/rollback 门禁
- 建议下一次会话开始时运行 `npm run rebuild-shadow`
