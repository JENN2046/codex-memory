# CM-2101 CM-2094 Original Store Continuity Historical Evidence Audit

审计日期：2026-07-11

```yaml
result: HISTORICAL_BINDING_NOT_FOUND
cm2100_decision_reference: "CM-2100-ER-20260711-CHANGES-REQUIRED-ORIGINAL-STORE-CONTINUITY-MISSING-03B54155"

historical_store_authority_evidence_found: false
original_store_continuity_evidence_bundle_ready: false
cm2094_original_store_continuity_proven: false
bootstrap_application_may_be_resubmitted_now: false

identity_creation_authorized: false
preflight_authorized: false
nonce_claim_authorized: false
tombstone_authorized: false
verify_authorized: false

rollbackDrillPassed: false
phase8Completed: false
```

本审计严格限定为 Git 对象、Git refs/reflog 元数据和已经跟踪的低披露 CM-2094
证据。没有读取 `.env`、原始 store、原始 audit、raw log、私有运行态、物理 store
路径或当前环境变量，也没有生成事后路径 hash。

## 审计结论

CM-2094 执行时没有把 memory-store authority 写入 frozen manifest、execution
context、final release decision 或 execution receipt。现有证据只能证明：

```yaml
isolated_runtime_store_used: true
durable_record_bytes: 269
durable_record_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"
```

它不能证明：

```yaml
runtime_store_authority_source: "<historical immutable source>"
store_root_binding_sha256: "<binding observed during CM-2094>"
store_instance_id: "<pre-existing immutable identity>"
binding_observed_at_cm2094_execution: true
```

因此不能生成满足 CM-2100 要求的 Original Store Continuity Evidence Bundle。
任何现在才生成的路径 hash、identity、inode/device 或环境快照都只能证明当前
选择，不能恢复 CM-2094 的历史连续性。

## 精确 Git 证据绑定

### Frozen executor

```yaml
runtime_source_commit: "10b1ea49257c0aa2c26e50a2291142093589d938"
runtime_source_tree: "f4273910483c096ff03d3c33f01c59187a2f6e2b"
executor_blob_oid: "536697ea15d8f73ebc963efba460b1cbd3b79884"
executor_bytes: 12782
executor_sha256: "46b83153c903915907acda0948dd5d2e69455b7a17bb5724506bf1a22703a423"
```

该 executor 会验证 runtime target 和 local HTTP route，但不会读取、规范化、hash
或持久化 `KNOWLEDGEBASE_ROOT_PATH` / `KNOWLEDGEBASE_STORE_PATH`。

### Execution manifest 与 context

```yaml
execution_packet_commit: "66cfae232b6609bbede9debc6f897f74ed8551c0"
execution_packet_tree: "88a4a6f92a9d380f568963604a8dbae3b9fe07c4"

manifest_blob_oid: "549f157ed65d0675fccfb2c8b68698a31c4666f2"
manifest_bytes: 5272
manifest_sha256: "0786167ba860d869873fdc32dad167a411d7d85617e2c08b01c1d4604ba3131d"
manifest_payload_sha256: "11bbbc72e4586654c0996d63090b586ec0da7bb4f2cccfc90b63af07cf31d0ee"

context_blob_oid: "4e07b97c08ab194895a7a965b6dde3d1a68c1238"
context_bytes: 2216
context_file_sha256: "566e88867eab2a153579e0a43d296a649221fe67df4c7e0dffec4b9412330b87"
context_canonical_sha256: "f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283"
```

Manifest 和 context 都没有 store authority、store-root binding 或 store instance
字段。Context 中的 `sourceAuthority=bridge_runtime_or_static_config` 只描述 native
runtime target 来源，不是 memory store 实例身份。

### Final release 与 execution receipt

```yaml
final_release_commit: "f1e2a8302e91b75beffeb418f57e591cf0789401"
final_release_tree: "1c5292b06ca1f04bcc8e1c5e34a156d4668becf7"
final_release_blob_oid: "a53c053ab1b882b0d6927152a0d3ee6db540296a"
final_release_bytes: 1325
final_release_sha256: "db9dd1cc6f884806e8ea0337e3d09765608fa0892ad7f29011d822805c1c0ccf"

execution_receipt_commit: "91c20ce4c9b85966ef2da6b7c37563ebbce0f365"
execution_receipt_tree: "6b9b6fae23ae534661a226b27aad01f33f17380d"
execution_receipt_blob_oid: "b310146b5219cb4db0e463275f10e8aae4d2f94a"
execution_receipt_bytes: 3078
execution_receipt_sha256: "fd22cec67c8d95eab2f95c10a52207529847d83942354331ba372f5edc41f277"
```

`f1e2a830…` 到 `91c20ce4…` 的 ancestry path 没有中间 commit。Receipt commit
新增了执行回执和 receipt contract，但没有新增 environment/store authority
artifact。

Receipt contract 的绑定为：

```yaml
blob_oid: "d93927d3db444b4f5a271cbb7e3201b5e5914497"
bytes: 3607
sha256: "75daf833c185294a14773b28ad70c50ffadcabcad355591e77078d5595d42165"
```

它要求 `isolatedRuntimeStoreUsed=true`，但没有 store-root binding 字段。

## 搜索覆盖

```yaml
git_all_refs_and_reflog_window_searched: true
window_start: "2026-07-11T12:30:00+08:00"
window_end: "2026-07-11T16:10:00+08:00"
observed_commits: 8
final_release_to_receipt_intermediate_commits: 0
git_notes_binding_found: false
```

对 manifest、context、final release 和 receipt 的递归字段检查确认，下列字段均
不存在：

```text
runtimeStoreAuthoritySource
storeRootBindingSha256
currentStoreBindingSha256
storeInstanceId
knowledgeBaseRootPath
knowledgeBaseStorePath
bindingObservedAtCm2094Execution
```

## 未执行边界

```yaml
current_candidate_store_inspected: false
current_candidate_store_binding_computed: false
current_candidate_store_compared_to_historical_binding: false

raw_path_read: false
raw_path_disclosed: false
raw_memory_read: false
raw_audit_read: false
private_runtime_state_read: false

identity_created: false
preflight_executed: false
nonce_claimed: false
native_reads: 0
native_writes: 0
tombstone_writes: 0
verify_operations: 0
rollback_or_compensation_operations: 0
```

## 路线判断

### 路线 A

```yaml
classification: "synthetic_clone_store_rollback_drill"
cm2094_original_store_rollback_proven: false
rollbackDrillPassed: false
```

路线 A 可以验证 tombstone 技术链，但不能关闭当前 Completion Audit 缺口。

### 路线 B

```yaml
classification: "new_identity_bound_synthetic_lifecycle"
new_native_write_authorization_required: true
recommended_for_existing_completion_audit: true
```

路线 B 从新 synthetic store 建立前置 identity，再依次申请新的 synthetic record
write、receipt、tombstone 和 verify。它不能复用 CM-2094 已消费授权，每个 native
action 都必须重新取得 action-specific 精确授权。

本审计只作路线判断，没有选择或授权路线 B。路线选择需要 Jenn 明确决定。

## 审计对象哈希

```yaml
json_path: "docs/near-model-memory-plan-pack/phase8_cm2094_original_store_continuity_audit_cm2101.json"
json_bytes: 5760
json_sha256: "06f9b83692c4d1203bacb09f26aee4d432b0118951e6f1d6a6c0a75c9bf85dcf"
json_payload_sha256: "e5cff2d23460233391dac9018d1084cf1784e3a4645e7b59bcb14a396e02e4de"
```
