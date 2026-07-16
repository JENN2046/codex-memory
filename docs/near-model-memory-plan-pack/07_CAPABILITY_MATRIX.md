# 07｜能力矩阵

| 能力 | 当前状态 | 默认开放 | operator-only | 需要新增 | production-ready |
|---|---|---:|---:|---:|---:|
| `search_memory` local/read bridge | 已有 | 是 | 否 | 否 | 部分 |
| `memory_overview` | 已有 | 是 | 否 | 否 | 部分 |
| `audit_memory` | 已有 | 是 | 否 | 否 | 部分 |
| default read-only MCP surface | 已有，需修 blocker 后重证 | 是 | 否 | 否 | 部分 |
| hidden tools hard reject | 已有 | 是 | 否 | 否 | 部分 |
| governed native realtime read | 三工具低披露 native read 已在 clean commit `1822d7e8…` 的 matching runtime 上机器重放并通过；使用 fixture provider 与隔离派生存储，不构成 production provider proof | 是 | 否 | 需要新外审接受；派生索引副作用仍不是 Phase 8 write proof | 否 |
| Phase 2 governed native read observation | 三次调用的 machine receipt projections、safe refs、per-call SHA-256 与 Windows/WSL machine receipt 已从 clean matching replay 自动验证，Phase 2 machine evidence eligible=true | 是 | 否 | 需要新外审/Completion Audit 受控应用；不授权写入 | 否 |
| native response shape compatibility | 本地 category-only 合同已实现；live/native proof 仍缺 | 是 | 否 | 需要 exact-authorized native read receipt / live proof | 否 |
| native read receipt schema compatibility | 本地 schema-only 合同已实现；只覆盖 future native read attempt/success/low-disclosure receipt 候选形状 | 是 | 否 | 需要 native target binding、audit、fallback、WSL/Linux、Windows/WSL smoke 的 separate exact-authorized receipts | 否 |
| native target binding receipt review | 本地 safe-reference-only review 合同已实现；不绑定 native target | 是 | 否 | 需要 exact-authorized native target binding receipt | 否 |
| native read proof receipt review | 本地 category-only/no-response-body review 合同已实现；不执行 native read | 是 | 否 | 需要 exact-authorized native read proof receipt | 否 |
| fallback distinction receipt review | 本地 category-only fallback/native distinction review 合同已实现；不执行 fallback/native comparison | 是 | 否 | 需要 exact-authorized fallback distinction receipt | 否 |
| low-disclosure proof receipt review | 本地 category-only disclosure-budget/redaction/projection review 合同已实现；不读取 raw output / raw audit | 是 | 否 | 需要 exact-authorized low-disclosure proof receipt | 否 |
| audit/scope receipt review | 本地 category-only audit-projection/scope-visibility/isolation review 合同已实现；不读取 raw audit rows 或 scope identifiers | 是 | 否 | 需要 exact-authorized audit receipt 和 scope visibility/isolation receipt | 否 |
| platform proof receipt review | 本地 category-only WSL/Linux 与 Windows/WSL smoke review 合同已实现；不执行命令、不读路径/日志/env/输出 | 是 | 否 | 需要 exact-authorized WSL/Linux proof 和 Windows/WSL smoke receipt | 否 |
| Phase 2 receipt bundle review-chain hardening | 本地 bundle contract 已要求 CM-2036 到 CM-2043 review chain；不收集或应用 receipt | 是 | 否 | 需要 exact-authorized receipts 和 receipt-bundle application evidence | 否 |
| Phase 2 receipt intake / patch hardened bundle binding | 本地 intake 与 patch preflight 已要求 hardened bundle prerequisite summary；不收集或应用 receipt | 是 | 否 | 需要 exact-authorized receipts 和 receipt-bundle application evidence | 否 |
| `prepare_memory_context` | 已实现本地/default read-only MVP | 是 | 否 | 需要 live/production 质量证明 | 否 |
| memory context package | 已实现本地 bounded package | 是 | 否 | 需要 live/production 质量证明 | 否 |
| task-start automatic recall | 已实现本地 wrapper / AGENTS 规则 | 是，本地规则 | 否 | 需要 runtime 观察 | 否 |
| recall quality gate | 已实现 fixture/local baseline | 是 | 否 | 需要 live/production quality proof | 否 |
| `propose_memory_delta` | 已实现 proposal-only | 是，proposal-only | 否 | 需要 commit/native write 后续 proof | 否 |
| `commit_memory_delta` | 本地 operator-only preflight；不默认公开；不执行写入 | 否 | 是 | 需要 exact approval、governance receipt、rollback posture、exact-authorized commit receipt 和后续 write proof | 否 |
| `record_memory` | 已有/部分；Phase 7 local proof gate 覆盖 operator surface；Phase 8 P8-T1 contract preflight 与 real-root readiness gate 已定义 | 否 | 是 | 需要 exact-approved real-root native write execution proof | 否 |
| `validate_memory` | 已有/部分；Phase 7 local proof gate 覆盖 operator surface | 否 | 是 | 需要 exact mutation proof | 否 |
| `tombstone_memory` | 已有/部分；Phase 7 local proof gate 覆盖 operator surface | 否 | 是 | 需要 destructive mutation proof | 否 |
| `supersede_memory` | 已有/部分；Phase 7 local proof gate 覆盖 operator surface | 否 | 是 | 需要 destructive mutation proof | 否 |
| native write delegation | P8-T1 contract preflight 与 approval-request readiness gate 已定义；未执行 real-root write | 否 | 是 | 需要 exact-approved real-root proof | 否 |
| Phase 8 receipt patch hardened bundle binding | 本地 patch preflight 已要求 hardened receipt-bundle prerequisite summary；不收集或应用 receipt | 否 | 是 | 需要 exact-authorized Phase 8 receipts 和 receipt-bundle application evidence | 否 |
| Phase 8 exact receipt request boundary | 本地 request-boundary contract 已实现；只从 CM-2053 route 准备未来 exact-authorized native-write proof receipt 字段清单，不收集/接收/应用 receipt、不执行 native write、不完成 Phase 8 | 否 | 是 | 需要 Jenn separate exact authorization 后的低披露 exact approval enforcement、native side effect、real-root durable write、verify、rollback、failure recovery、output disclosure、audit、receipt-application evidence | 否 |
| audit receipt | 部分；Phase 2 audit/scope review 已定义，write audit receipt contract/readiness 已定义 | 是 | 否 | 需要 exact-authorized Phase 2 audit receipt 和 live/native write receipt | 否 |
| rollback posture | CM-2107 已在 identity-bound synthetic store 完成一次 append-only tombstone 和一次 marker-aware lifecycle verify；CM-2108 已将 rollback evidence 应用到 Completion Audit | 是 | 否 | 默认产品 retrieval 的 tombstone awareness 仍未证明；failure recovery 仍独立 | 否 |
| failure recovery posture | CM-2109 隔离 synthetic harness 的 pre-claim、pre-commit、ambiguous post-commit 三个 case 已通过；CM-2110 已应用 evidence；CM-2114 后续完成 Phase 8 revalidation | 否 | 是 | 仅证明受控 synthetic failure behavior，不构成 production-provider reliability proof | 否 |
| output disclosure budget | 部分；native write low-disclosure preflight 已定义 | 是 | 否 | 需要 end-to-end live proof | 否 |
| Codex default runtime policy | clean matching runtime 的实际 stdio tools/list、policy gate、test:all 与 gate:ci records 已通过，Phase 9 machine artifact eligible=true；默认仍严格为五个 read/context/proposal 工具 | 是，仅 read/context/proposal | 否 | 重新外审；不得由 observation 自动扩张 | 否 |
| external review patch hardened bundle binding | 本地 patch preflight 已要求 hardened review-bundle prerequisite summary；不接收 review、不应用 bundle、不执行 tag/release | 否 | 是 | 需要 observation/external review/tag approval 和 review-bundle application evidence | 否 |
| external review bundle application gate | CM-2082 已按 CM-2081 精确决定执行并 accepted；其历史 application 前置要求 externalReviewPassed=true 且 tagApprovalPacketPassed=false | 否 | 是 | 已完成受控 application chain；不得由该 gate 单独推导后续 tag approval | 否 |
| external review bundle application receipt | CM-2082 低披露 receipt contract 已 accepted；receipt preparation 与 patch application 仍分步验证 | 否 | 是 | 回执绑定 payload SHA-256 `b74dd9ad…6cfeb` | 否 |
| external review completion-audit patch boundary | CM-2082 patch boundary 已 accepted，且在应用前保持 applied/phase/tag/readiness 为 false | 否 | 是 | 仅允许精确 Completion Audit 字段应用 | 否 |
| external review completion-audit patch application | CM-2082 精确 application 已 accepted，`externalReviewEvidenceBundleAppliedToCompletionAudit=true`；不完成 Phase 9/10 | 否 | 是 | 后续 Tag Approval 与 Phase 8 均通过各自独立链路完成；不由本 application 自动推导 | 否 |
| remaining evidence route | 本地 route contract 已实现；只分类 completion-audit / trace-matrix 缺口，不创建 evidence、不完成阶段 | 否 | 否 | 需要按 route 收集 exact receipts / external review / command gates / local source evidence | 否 |
| Phase 2 exact receipt request boundary | 本地 request-boundary contract 已实现；只从 CM-2053 route 准备未来 exact-authorized receipt 字段清单，不收集/接收/应用 receipt、不执行 native read、不完成 Phase 2 | 否 | 否 | 需要 Jenn separate exact authorization 后的低披露 native target binding、native read、fallback、low-disclosure、audit/scope、WSL/Linux、Windows/WSL、receipt-application evidence | 否 |
| external review request boundary | 本地 request-boundary contract 已实现；只从 CM-2053 route 准备未来 observation/external-review/tag-approval/review-bundle application request entries，不接收 review/tag approval、不 apply patch、不完成 Phase 9/10 | 否 | 否 | 需要 observation/dogfood review、external review、tag approval packet、review-bundle application evidence | 否 |
| external review hash-bound handoff | v2 clean matching evidence 已获 CM-2080 外审通过，并由 CM-2082 应用到 Completion Audit；canonical payload SHA-256 为 `2215bb33…622f2` | 否 | 是 | Tag Approval 与 Phase 8 后续均通过独立链路完成；本 handoff 本身不授权二者 | 否 |
| Phase 8 receipt-backed evidence application | CM-2095/2108/2110/2111 历史证据 + CM-2113 owner proof + CM-2114 reapplication | 否 | 是（Phase 8 only） | 18/18 evidence；`phase8Completed=true`、`revalidated_complete`；full plan/readiness 仍 false | 否 |
| real Tag Approval Packet | CM-2083 独立决定已接受精确 packet；CM-2084/2085 完成本地 annotated tag 创建与回执，CM-2086/2087 完成一次精确 tag push 与回执 | 否 | 是 | 不授权 GitHub Release、包发布、deploy、cutover 或 readiness | 否 |
| evidence request packet rollup | 本地 rollup contract 已实现；只把 Phase 2 exact receipt、Phase 8 exact receipt、Phase 9/10 review request boundaries 合并为 future-only packet，不接受或应用 evidence | 否 | 否 | 需要 separate authorization/review/receipt 后才能进入 application 或 completion audit | 否 |
| evidence application router | 本地 router contract 已实现；只从 CM-2057 packet 准备未来 application 顺序，不接收 evidence、不应用 completion-audit patch、不完成阶段 | 否 | 否 | 需要 separate evidence material 和 exact authorization 后才能进入 application/patch | 否 |
| evidence material metadata gate | 本地 metadata gate 已实现；只从 CM-2058 router 准备低披露 metadata slots，不接收 material body/value、不接受 evidence、不完成阶段 | 否 | 否 | 需要 separate low-disclosure evidence material metadata 和 exact authorization 后才能进入 acceptance/application | 否 |
| evidence material metadata packet | 本地 packet contract 已实现；只验证 CM-2059 slots 的低披露/category-only/body-free/value-free packet 形状，不接收 material body/value、不接受 evidence、不应用 evidence | 否 | 否 | 需要 separate exact authorization 和 low-disclosure evidence material 后才能进入 acceptance/application | 否 |
| evidence material acceptance preflight | 本地 preflight contract 已实现；只从 CM-2060 packet 准备 exact authorization 与 low-disclosure material 要求，不接受授权、不接收 material body/value、不接受或应用 evidence | 否 | 否 | 需要 separate exact authorization packet 和 low-disclosure evidence material 后才能进入 acceptance | 否 |
| evidence material intake boundary | 本地 intake boundary contract 已实现；只从 CM-2061 preflight 准备 separate exact authorization packet 与 low-disclosure material intake 要求，不接收授权、不接收 material body/value、不接受或应用 evidence | 否 | 否 | 需要 actual exact authorization packet 和 low-disclosure material 进入 manual review 后才能考虑 acceptance | 否 |
| evidence material manual review gate | 本地 manual review gate contract 已实现；只从 CM-2062 intake 准备 operator manual review checklist，不完成 review、不接收授权、不接收 material body/value、不接受或应用 evidence | 否 | 否 | 需要 actual reviewed exact authorization 和 low-disclosure material 后才能考虑 acceptance | 否 |
| evidence material acceptance eligibility gate | 本地 eligibility gate contract 已实现；只从 CM-2063 manual review gate 准备 future acceptance eligibility checklist，不完成 review、不作 acceptance decision、不接收授权、不接收 material body/value、不接受或应用 evidence | 否 | 否 | 需要 actual acceptance decision after reviewed authorization and low-disclosure material 后才能考虑 evidence acceptance/application | 否 |
| evidence material acceptance decision request boundary | 本地 request boundary contract 已实现；只从 CM-2064 eligibility gate 准备 future reviewed acceptance decision packet request entries，不完成 review、不提交或作 acceptance decision、不接收授权/材料、不接受或应用 evidence | 否 | 否 | 需要 actual reviewed acceptance decision packet 后才能考虑 evidence acceptance/application | 否 |
| evidence material acceptance decision packet metadata gate | 本地 metadata gate contract 已实现；只从 CM-2065 request boundary 准备 future reviewed acceptance decision packet metadata slots，不接收 decision packet、不提交或作 acceptance decision、不接受或应用 evidence | 否 | 否 | 需要 actual low-disclosure reviewed acceptance decision packet 后才能考虑 acceptance | 否 |
| evidence material acceptance chain completion-audit binding | 本地 completion-audit / trace matrix 绑定已实现；要求 CM-2053 到 CM-2066 本地 gate 链作为 local_contract evidence 存在，但不把它当成 exact receipt、external review、material acceptance 或 application evidence | 否 | 否 | 需要 actual low-disclosure reviewed acceptance decision packet、exact receipts、external review/tag approval 和 patch evidence 后才能考虑 completion | 否 |
| evidence material reviewed decision packet readiness gate | 本地 readiness/absence gate 已实现；只从 CM-2066 metadata gate 准备 actual low-disclosure reviewed decision packet readiness checklist，不接收 packet body/value、不接受 packet、不提交或作 decision、不接受或应用 evidence | 否 | 否 | 需要 actual low-disclosure reviewed acceptance decision packet 后才能考虑 packet/material acceptance/application | 否 |
| evidence material reviewed decision packet intake preflight | 本地 intake preflight 已实现；只从 CM-2068 readiness gate 准备 future actual low-disclosure reviewed decision packet reference intake requirements，不接收 actual packet/body/value、不接受 packet、不提交或作 decision、不接受或应用 evidence | 否 | 否 | 需要 actual low-disclosure reviewed acceptance decision packet reference 后才能考虑 intake execution；acceptance/application 仍需后续 gate | 否 |
| evidence material reviewed decision packet reference intake execution | 本地 reference-only intake execution 已实现；只从 CM-2069 preflight 接收 low-disclosure reviewed acceptance decision packet references，不接收 actual packet body/value、不接受 packet、不提交或作 decision、不接受或应用 evidence | 否 | 否 | 需要 reviewed decision packet reference review boundary 后才能考虑 acceptance decision 或 material acceptance；exact receipts、external review/tag approval 和 patch evidence 仍独立缺失 | 否 |
| evidence material reviewed decision packet reference review boundary | 本地 reference review boundary 已实现；只从 CM-2070 reference intake 准备 reviewed acceptance decision boundary checklist，不接收 actual packet body/value、不接受 packet、不提交或作 decision、不接受或应用 evidence | 否 | 否 | 需要 acceptance decision boundary 后才能考虑 packet/material acceptance；exact receipts、external review/tag approval 和 patch evidence 仍独立缺失 | 否 |
| evidence material reviewed acceptance decision boundary | 本地 reviewed acceptance decision boundary 已实现；只从 CM-2071 reference review 结果准备低披露、reference-only boundary checklist，不接收 actual decision packet/body/value、不接受 packet、不提交或作 decision、不接受或应用 evidence | 否 | 否 | 需要 actual low-disclosure reviewed acceptance decision packet under separate exact boundary 后才能考虑 packet/material acceptance；exact receipts、external review/tag approval 和 patch evidence 仍独立缺失 | 否 |
| Codex default full capability | 不应开放；Phase 9 gate 对默认写/破坏/commit 扩权 fail closed | 否 | 否 | 需长期观察、外部审查、单独 proof | 否 |
| release/tag external review chain binding | 本地 release/tag gate 已要求 hardened external-review intake/bundle/patch chain；不接收 review、不接受 tag approval、不执行 tag/release | 否 | 是 | 需要 external review、真实 tag approval 和 review-bundle application evidence | 否 |
| release/tag readiness policy | Phase 10 本地 tag 命名/non-claims/tag approval packet gate 已实现，且已绑定 hardened external-review chain | 否，评估-only | 是，实际 tag/release 需另批 | 需要外部审查和真实 tag approval | 否 |

## 能力解释

### 已有但不能过度宣称

```text
search_memory / memory_overview / audit_memory 默认只读可用
```

不能写成：

```text
Codex 已拥有完整实时记忆能力
```

### 新增核心

```text
prepare_memory_context
```

这是接近模型内置记忆体验的关键。

### 最高风险

```text
tombstone_memory
supersede_memory
native write production
Codex default expanded write authority
```

这些必须最后做。
