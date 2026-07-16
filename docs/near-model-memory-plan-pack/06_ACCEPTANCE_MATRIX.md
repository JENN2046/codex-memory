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
| CM-2095 Phase 8 completion-evidence application receipt | Phase 8 六项 receipt-backed evidence 与 bundle application；rollback/failure 仍 false | 是 | 是 |
| CM-2108 identity-bound rollback application receipt | Phase 8 rollback drill evidence；failure recovery 与 Phase 8 completion 仍 false | 否，read-only tag 可不等 | 是 |
| CM-2110 isolated failure-recovery application receipt | Phase 8 three-case recovery evidence；Phase 8 completion 仍为单独 gate | 否，read-only tag 可不等 | 是 |
| CM-2111 Phase 8 completion-audit application receipt | 历史 15 项 evidence application；CM-2112 后不再是当前 Phase 8 completion authority | 否，read-only tag 可不等 | 历史证据保留，当前需重验证 |
| CM-2112 Phase 8 completion revalidation decision | 历史检查点 `phase8Completed=false`；要求 VCPToolBox-owned runtime、真实 transport、稳定 target/store identity 三项 exact proof | 否 | 历史状态：`needs_revalidation` |
| CM-2113 VCPToolBox owner native proof receipt | 官方 DailyNote owner runtime、真实 stdio→authenticated local HTTP→stdio transport、稳定 synthetic store identity | 否，read-only tag 可不等 | 是，exact receipt |
| CM-2114 Phase 8 revalidation application receipt | 18/18 Phase 8 evidence；只完成 Phase 8，不完成完整计划包、不声明 readiness | 否，read-only tag 可不等 | 是，`revalidated_complete` |
| CM-2080 exact external review decision | Phase 9/10 external-review prerequisite | 是 | 是 |
| CM-2082 Completion Audit application receipt | Phase 9/10 review-bundle application field only | 是 | 是 |
| CM-2115-R1 Phase 2 Completion Audit application receipt | CM-2080-reviewed Phase 2 machine manifest + Windows/WSL receipt；九项 exact evidence 一次性应用 | 是 | 是 |
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

## CM-2115-R2 Exact Application Boundary

| Evidence | Acceptance boundary | Independent review | Current status |
|---|---|---|---|
| CM-2115-R2 Phase 2 binding receipt | Durable one-shot claim + exact application commit/tree/diff/pre-post blobs + receipt-time upstream Git revalidation | Required | Frozen as the strengthened v2 binding receipt; rebuilt snapshot remains pending independent review |

R1 receipt shape alone is not accepted as current patch evidence.

## CM-2117 Exact Full-plan Application Boundary

| Evidence | Acceptance boundary | Current status |
|---|---|---|
| CM-2117 full-plan application | Exact five-path patch + durable one-shot claim + direct-child application commit + separate binding receipt | Pending final execution release and application binding |

Gate or decision-content acceptance alone does not complete the plan pack.
