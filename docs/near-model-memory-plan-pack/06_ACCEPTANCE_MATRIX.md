# 06｜验收矩阵

## 总验收原则

```text
没有 evidence 的能力不宣称。
没有 live proof 的能力不写 production。
没有 write proof 的能力不写 full capability。
没有 observation window 的能力不默认开放。
```

## Gate 矩阵

| Gate | 必须通过于 | 阻塞 tag | 阻塞 production |
|---|---|---:|---:|
| goal / non-claims 文档 | Phase 0 | 是 | 是 |
| hardened explicit tools bypass fix | Phase 1 | 是 | 是 |
| AtomicFileWriter TOCTOU fix | Phase 1 | 是 | 是 |
| `npm run test:all` | Phase 1+ | 是 | 是 |
| `npm run gate:ci -- --json` | Phase 1+ | 是 | 是 |
| default read-only surface | Phase 2 | 是 | 是 |
| hidden tools hard reject | Phase 2 | 是 | 是 |
| native read proof | Phase 2 | 是 | 是 |
| fallback distinction | Phase 2 | 是 | 是 |
| low-disclosure proof | Phase 2 | 是 | 是 |
| `prepare_memory_context` contract | Phase 3 | 是，context milestone | 是 |
| context package quality baseline | Phase 5 | 是，context milestone | 是 |
| memory delta proposal-only proof | Phase 6 | 否 | 是 |
| operator-only full surface proof | Phase 7 | 否 | 是 |
| native write proof | Phase 8 | 否，read-only tag 可不等 | 是 |
| rollback drill | Phase 8 | 否，read-only tag 可不等 | 是 |
| failure recovery proof | Phase 8 | 否，read-only tag 可不等 | 是 |
| observation window | Phase 9 | 视 milestone | 是 |
| external review | Phase 10 | 是 | 是 |

## read-only/context milestone 最低验收

```text
Phase 1 blockers fixed
test:all PASS
gate:ci PASS
read-only MCP surface PASS
native read proof PASS
fallback distinction PASS
prepare_memory_context MVP PASS
recall quality baseline PASS
README non-claims PASS
external review PASS
```

## native write production 最低验收

```text
operator-only full surface proof PASS
exact approval enforcement PASS
native side-effect receipt PASS
audit receipt PASS
rollback posture PASS
verify_write PASS
failure recovery proof PASS
output disclosure budget PASS
30-day observation or equivalent dogfood review PASS
external review PASS
```

## release 命名规则

允许：

```text
v0.2.0-readonly-context-rc
v0.3.0-operator-full-surface-rc
v0.4.0-native-write-proof-rc
```

禁止：

```text
v1-full-memory
complete-realtime-memory
production-write-ready
model-memory-complete
```
