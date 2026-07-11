# codex-memory CM-2096 v3 非执行实现独立审查决定

审查日期：2026-07-11

```yaml
result: PASS_IMPLEMENTATION_ONLY

decision_reference: "CM-2096-ER-20260711-V3-IMPLEMENTATION-PASS-NO-EXECUTION-75FAFECD"

v3_implementation_review_passed: true
v3_packet_review_passed: true
ready_for_bootstrap_and_preflight_application: true
ready_for_action_specific_execution_authorization: false

target_store_bootstrap_authorized: false
target_store_preflight_authorized: false
nonce_claim_authorized: false
tombstone_execution_authorized: false
verify_execution_authorized: false

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
```

## 审查对象绑定

```yaml
implementation:
  commit: "6f4f7867e8260fc79113239de4ff8d73b1425de9"
  tree: "c9247b19a9d84e170f62ced27a190051bbeb7a3a"

execution_packet:
  commit: "1ba07b0cfab17da432a860e2c640569288e626e0"
  tree: "f0919cf536bba3d965979cdf0f65f8b5f31bbd93"
  blob_oid: "74c42292f61dcf7e6033207c573a878f6f1ea64c"
  bytes: 7879
  sha256: "75fafecd9b5be4195aef83328bb5d18ab9f3bf33502a731d79a05c04287d9768"
  payload_sha256: "0b925a72d24deb004112b0f847c8b70cc533f0d84a91f11eda78e435aefa097d"

review_surface:
  commit: "b113a5e60f4f923f23f7950eecc5aa4cb2abb61a"

checkpoint:
  commit: "b9a993df1d1ff17c1affee9e23507d5cb2933c2a"
  effect: "status and governance checkpoint only"
```

Checkpoint `b9a993df…` 没有修改 v3 runtime、packet 或执行合同。

## 已确认通过的实现

### 1. Target store identity 为只读、fail-closed 校验

目标 store identity 精确绑定：

```yaml
store_reference: "cm2094-phase8-synthetic-native-write-store"
store_instance_id: "cm2094-phase8-synthetic-native-store-001"
store_role: "cm2094_synthetic_native_write_store"
synthetic_only: true

target_memory_id_ref: "vcp-kb-4f863f52455147c6"
target_record_bytes: 269
target_record_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"

identity_sha256: "e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13"
replacement_allowed: false
reinitialization_allowed: false
```

Verifier 只读取 identity，不会自动创建、覆盖或修复 identity 文件。缺失、无法读取或字节漂移均在 nonce claim 前失败。

### 2. Real-store collector 不再接受调用者伪造 projection

`collectCm2096RealStoreProjection()` 会直接读取选定 synthetic store：

* Pre-rollback 必须恰好存在一个 Markdown；
* Post-rollback 必须恰好存在两个 Markdown；
* 原始 record 必须唯一匹配 `4f863f52455147c6`；
* marker 必须唯一匹配 `27a5e58649908bbc`；
* 文件字节数和 SHA-256 必须精确匹配；
* 不返回正文或物理路径；
* 出现其他文件、额外 Markdown 或 hash 漂移时 fail closed。

这已经解决 v2 中普通调用者直接传入 projection 和 candidate refs 的主要问题。

### 3. Tombstone decision intake 已独立实现

未来决定必须精确绑定：

* execution packet commit、blob 和 SHA；
* implementation commit/tree；
* store identity；
* target record；
* 331-byte payload；
* 507-byte marker；
* context、allowlist 和 scope；
* nonce、receipt、registry；
* 一次 tombstone、一次 verify；
* 零 retry、supersede 和 compensation；
* 未过期的授权窗口。

复制 intake 后的决定对象会失去 `WeakSet` 机器身份，不能进入 gate。

### 4. Assertion 原子消费与 app 强制路径成立

CM-2096 gate 在第一次 assertion 验证时原子调用：

```text
consumeWriteInvocation(claimId, bindingHash)
```

只有第一次调用能够进入：

```text
WRITE_INVOCATION_CONSUMED
```

并发和后续串行重放均会失败。

真实 app 路径还会拒绝：

* 调用者直接提供 `exactApprovalResult`；
* verifier 缺失；
* native write delegation 不是 `primary`；
* 无效或重复使用的 assertion；
* tombstone 本地 fallback。

### 5. Native read delegation 已硬关闭

运行时预检现在要求：

```yaml
native_write_delegation_mode: "primary"
native_read_delegation_mode: "off"
```

Allowlist 同时要求：

```yaml
nativeReadTools: []
nativeReadAllowed: false
```

因此低披露 verify 只使用本地治理 audit 和精确 store 投影，不会意外触发 VCP native search、embedding 或其他真实记忆读取。

### 6. 精确 receipt correlation 已实现

Verify 会搜索精确匹配的 tombstone receipt，而不是使用第一条同 scope 记录。

必须匹配：

```yaml
tool_name: "tombstone_memory"
receipt_id: "cm2096-tombstone-drill-receipt-001"
approval_action: "live_bridge_tombstone_memory_proof"
approval_decision_reference: "<exact future decision>"
claim_binding_hash: "<exact claim binding>"
runtime_target_reference: "<packet target>"

scope_fingerprint_present: true
scope_fingerprint_matched: true
write_allowed: true
native_invocation_attempted: true
native_invocation_receipt_binding_matched: true
memory_write_performed: true
raw_request_persisted: false
raw_response_persisted: false
```

旧的、不相关的 tombstone receipt 不会被误接受。

### 7. Frozen executor 输入面已经收窄

Executor 只接受：

```text
--execution-packet-commit <40-hex commit>
--future-decision-commit <40-hex commit>
```

不接受：

* write callback；
* verify callback；
* store path 参数；
* projection 参数；
* candidate refs；
* target/action 覆盖；
* failure-stage 覆盖。

运行时还要求 clean detached checkout，且 `HEAD`/tree 精确等于 implementation commit/tree。

### 8. Synthetic E2E 测试覆盖真实链路

Fixture 覆盖：

```text
app
→ governed bridge
→ local HTTP MCP
→ write-enabled VCPToolBox shim
→ exact 507-byte marker
→ real-store collector
→ local audit_memory
→ exact low-disclosure verify
```

并测试了：

* 两个并发 tombstone 调用只有一个成功；
* 第三次串行重放失败；
* marker 文件总数和 hash 精确；
* registry 最终状态可进入 `CONSUMED_SUCCESS`；
* 无 native read delegation。

---

# 执行授权前仍存在的阻断

## 阻断一：Target-store bootstrap receipt 尚不存在

Packet 当前明确记录：

```yaml
targetStoreIdentityBootstrapReceiptPresent: false
targetStorePreflightExecutedAtPacketFreeze: false
```

身份文件尚未获得独立 bootstrap 许可和回执。

在 bootstrap 前不得：

* 创建 identity；
* 覆盖已有 identity；
* 把现有文件直接登记为本次初始化成功；
* claim tombstone nonce。

需要单独的 bootstrap application，使用独占创建语义，并生成低披露 receipt。

## 阻断二：必须证明这是 CM-2094 实际使用的 store，而不是复制品

Executor 的 store 根来自：

```text
KNOWLEDGEBASE_ROOT_PATH
```

identity 和 269-byte record 理论上可以被复制到另一个目录。

因此，仅验证：

```text
identity bytes + record bytes + record SHA
```

还不能完全证明该目录就是 CM-2094 实际写入的原 store。

Bootstrap/preflight receipt 至少必须绑定：

```yaml
store_instance_id: "cm2094-phase8-synthetic-native-store-001"
store_reference: "cm2094-phase8-synthetic-native-write-store"

cm2094_execution_receipt_commit: "91c20ce4c9b85966ef2da6b7c37563ebbce0f365"
cm2094_record_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"

runtime_store_authority_source: "<safe frozen authority>"
store_root_binding_hash: "<low-disclosure stable binding>"
```

不得披露物理路径，但必须防止执行时临时切换到内容相同的 clone store。

若无法证明原 store 连续性，本次最多只能被分类为：

```text
synthetic clone-store rollback drill
```

不能直接证明 CM-2094 原写入的 rollback。

## 阻断三：有效 retrieval 仍是专用 lifecycle filter，不是产品读路径

当前 verifier 从实际 store 收集：

```text
[target record ref, marker ref]
```

然后调用：

```text
filterCm2096EffectiveCandidateRefs()
```

将 tombstoned target 排除。

这已经不是调用者伪造数据，但仍然没有证明默认 `search_memory`、`memory_overview` 或其他产品读取入口已经使用该 filter。

执行授权前必须明确冻结以下二选一：

### 方案 A：产品路径集成

把 marker-aware lifecycle filter 接入真实 governed retrieval，并证明目标不会作为有效记忆返回。

### 方案 B：专用权威 rollback verify

明确规定：

```text
cm2096_marker_aware_effective_visibility_projection
```

就是本次 rollback drill 的权威有效性判断面，不把结果扩大解释为默认产品搜索已经 tombstone-aware。

若采用方案 B，回执必须明确：

```yaml
default_product_retrieval_tombstone_awareness_proven: false
rollback_drill_lifecycle_projection_proven: true
```

不得混淆这两个结论。

## 阻断四：Scope fingerprint 应在 verifier 内重新计算

当前 packet 的 scope fingerprint 已独立复算正确：

```text
156df3fc92eac7b54c8ac17abc1b9c7c13e02da4cbbc5d42a18a3a5bb1317d66
```

但 verifier 对 `expectedScopeFingerprint` 目前只检查它是不是 64 位十六进制，并没有执行：

```text
sha256Canonical(scope) === expectedScopeFingerprint
```

执行授权前应补充该比较，并增加错误 fingerprint 的负向测试。

虽然当前冻结 packet 的值正确，这仍是 exact-correlation 实现中的一个应关闭缺口。

## 阻断五：Future decision 尚未形成可验证的最终 Git 身份

当前：

```yaml
future_exact_tombstone_decision_absent: true
```

Decision intake 会验证传入 commit 中的决定内容，但 packet 不可能提前绑定未来决定的 commit、blob 和文件 SHA。

正确流程仍应是：

```text
签发不可执行的 tombstone decision content
→ 冻结决定原始字节
→ 复算 commit/blob/SHA
→ 生成最终 execution-release manifest
→ 独立最终释放审查
→ 才允许执行
```

不得让任意人自行构造具有预留 `decisionReference` 的 JSON 后直接进入 executor。

## 阻断六：真实 read-only preflight 尚未执行

执行前需要单独冻结低披露 preflight receipt，至少证明：

```yaml
target_store_identity_matched: true
pre_rollback_markdown_count: 1
target_record_match_count: 1
marker_match_count: 0

target_record_bytes: 269
target_record_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"

native_read_delegation_mode: "off"
native_write_performed: false
nonce_claimed: false
receipt_created: false
```

Preflight 只允许读取精确 synthetic target 的 bytes/hash，不得读取其他真实记忆。

---

# 当前效力

```yaml
v3_implementation_review_passed: true
v3_packet_review_passed: true

target_store_identity_initialized: false
target_store_preflight_passed: false
future_tombstone_decision_frozen: false
final_execution_release_passed: false

nonce_claimed: false
tombstone_writes: 0
verify_operations: 0
supersede_operations: 0
compensation_operations: 0
native_reads: 0

rollbackDrillPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```

## 下一步允许范围

只允许准备：

1. Target-store bootstrap authorization request；
2. 一次性 identity bootstrap 与 receipt；
3. 只读 real-store preflight request 与 receipt；
4. scope fingerprint 内部复算修复；
5. rollback verify 语义选择：产品路径集成或专用权威 projection；
6. 不可执行 tombstone decision content application。

在这些步骤完成并接受独立复核前，不得执行：

* `tombstone_memory`；
* verify；
* nonce claim；
* execution receipt 创建；
* supersede；
* compensation；
* registry marker 删除或重建；
* Phase 8 completion 声明。
