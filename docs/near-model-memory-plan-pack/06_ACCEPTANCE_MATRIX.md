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
| native response shape compatibility local contract | Phase 2 | 是 | 是 |
| native read receipt schema compatibility local contract | Phase 2 | 是 | 是 |
| native target binding receipt review local contract | Phase 2 | 是 | 是 |
| native read proof receipt review local contract | Phase 2 | 是 | 是 |
| fallback distinction receipt review local contract | Phase 2 | 是 | 是 |
| low-disclosure proof receipt review local contract | Phase 2 | 是 | 是 |
| audit/scope receipt review local contract | Phase 2 | 是 | 是 |
| platform proof receipt review local contract | Phase 2 | 是 | 是 |
| receipt bundle review-chain hardening local contract | Phase 2 | 是 | 是 |
| receipt intake / patch hardened bundle binding local contract | Phase 2 | 是 | 是 |
| governed native read low-disclosure observation local contract | Phase 2 | 是 | 是 |
| governed native read exact receipt application | Phase 2 | 是 | 是 |
| machine-generated native-read execution manifest on clean matching runtime | Phase 2 | 是 | 是 |
| CM-2080 exact external review decision | Phase 9/10 external-review prerequisite | 是 | 是 |
| CM-2082 Completion Audit application receipt | Phase 9/10 review-bundle application field only | 是 | 是 |
| native read proof | Phase 2 | 是 | 是 |
| fallback distinction | Phase 2 | 是 | 是 |
| low-disclosure proof | Phase 2 | 是 | 是 |
| audit receipt and scope isolation proof | Phase 2 | 是 | 是 |
| WSL/Linux and Windows/WSL smoke proof | Phase 2 | 是 | 是 |
| `prepare_memory_context` contract | Phase 3 | 是，context milestone | 是 |
| context package quality baseline | Phase 5 | 是，context milestone | 是 |
| memory delta proposal-only proof | Phase 6 | 否 | 是 |
| memory delta operator commit preflight | Phase 6 | 否 | 是 |
| operator-only full surface proof | Phase 7 | 否 | 是 |
| Phase 8 receipt patch hardened bundle binding local contract | Phase 8 | 否，read-only tag 可不等 | 是 |
| Phase 8 exact receipt request boundary local contract | Phase 8 | 否，read-only tag 可不等 | 是 |
| native write proof | Phase 8 | 否，read-only tag 可不等 | 是 |
| rollback drill | Phase 8 | 否，read-only tag 可不等 | 是 |
| failure recovery proof | Phase 8 | 否，read-only tag 可不等 | 是 |
| default runtime policy hold gate | Phase 9 | 视 milestone | 是 |
| equivalent dogfood observation evidence application | Phase 9 | 视 milestone | 是 |
| machine-generated replayable observation artifact | Phase 9 | 视 milestone | 是 |
| hash-bound external review handoff bundle | Phase 9 / Phase 10 | 视 milestone | 是 |
| canonical readable self-hashed review bundle | Phase 9 / Phase 10 | 是 | 是 |
| observation window | Phase 9 | 视 milestone | 是 |
| external review patch hardened bundle binding local contract | Phase 9 / Phase 10 | 是 | 是 |
| release/tag external review chain binding local contract | Phase 10 | 是 | 是 |
| external review bundle application gate local contract | Phase 9 / Phase 10 | 是 | 是 |
| external review bundle application receipt local contract | Phase 9 / Phase 10 | 是 | 是 |
| external review completion-audit patch boundary local contract | Phase 9 / Phase 10 | 是 | 是 |
| external review completion-audit patch application local contract | Phase 9 / Phase 10 | 是 | 是 |
| remaining evidence route contract | Full plan pack | 是 | 是 |
| Phase 2 exact receipt request boundary local contract | Phase 2 | 是 | 是 |
| external review request boundary local contract | Phase 9 / Phase 10 | 是 | 是 |
| evidence request packet rollup local contract | Full plan pack | 是 | 是 |
| evidence application router local contract | Full plan pack | 是 | 是 |
| evidence material metadata gate local contract | Full plan pack | 是 | 是 |
| evidence material metadata packet local contract | Full plan pack | 是 | 是 |
| evidence material acceptance preflight local contract | Full plan pack | 是 | 是 |
| evidence material intake boundary local contract | Full plan pack | 是 | 是 |
| evidence material manual review gate local contract | Full plan pack | 是 | 是 |
| evidence material acceptance eligibility gate local contract | Full plan pack | 是 | 是 |
| evidence material acceptance decision request boundary local contract | Full plan pack | 是 | 是 |
| evidence material acceptance decision packet metadata gate local contract | Full plan pack | 是 | 是 |
| evidence material acceptance chain completion-audit binding local contract | Full plan pack | 是 | 是 |
| evidence material reviewed decision packet readiness gate local contract | Full plan pack | 是 | 是 |
| evidence material reviewed decision packet intake preflight local contract | Full plan pack | 是 | 是 |
| evidence material reviewed decision packet reference intake execution local contract | Full plan pack | 是 | 是 |
| evidence material reviewed decision packet reference review boundary local contract | Full plan pack | 是 | 是 |
| evidence material reviewed acceptance decision boundary local contract | Full plan pack | 是 | 是 |
| external review | Phase 10 | 是 | 是 |
| release tag readiness policy gate | Phase 10 | 是 | 是 |

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
