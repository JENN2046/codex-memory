# codex-memory CM-2096 Target-store Identity Bootstrap 独立授权申请（CM-2100）

申请日期：2026-07-11

本申请只请求审查一次精确、排他的 target-store identity bootstrap。它不创建
identity，不运行 target-store preflight，不读取 target record，不 claim CM-2096
tombstone nonce，也不调用 `record_memory`、`tombstone_memory`、
`supersede_memory` 或 verify。

## 申请结论边界

```yaml
bootstrap_authorization_requested: true
bootstrap_authorization_currently_granted: false
bootstrap_may_execute_from_this_request: false

target_store_preflight_authorization_requested: false
target_record_read_authorized: false
nonce_claim_authorized: false
tombstone_execution_authorized: false
verify_execution_authorized: false

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```

只有新的独立决定明确绑定本申请及安全 store authority 后，bootstrap 才可能
执行。本申请文本和本地 contract 通过都不构成授权。

## 已冻结的前置决定

CM-2096 v3 非执行审查决定已经按下载文件原始字节单独冻结：

```yaml
decision_reference: "CM-2096-ER-20260711-V3-IMPLEMENTATION-PASS-NO-EXECUTION-75FAFECD"
source_commit: "1179eb919f24da455521a85e12f9f093f9d9d3fa"
source_tree: "ae7dcad2799fa043f7f6d8a4587cad15711b5993"
blob_oid: "fecb6baee648d87beec7c9262b2ae9ee086135f7"
bytes: 11698
sha256: "ae54dc7d2034d031c39f5bce1fa3d8123cdb931f764d9bac089fdf029d68947b"
```

该决定只接受 v3 implementation/packet，不授权 bootstrap、preflight、nonce
claim、tombstone 或 verify。

## V3 implementation 与 packet 绑定

```yaml
implementation_commit: "6f4f7867e8260fc79113239de4ff8d73b1425de9"
implementation_tree: "c9247b19a9d84e170f62ced27a190051bbeb7a3a"

execution_packet_commit: "1ba07b0cfab17da432a860e2c640569288e626e0"
execution_packet_tree: "f0919cf536bba3d965979cdf0f65f8b5f31bbd93"
execution_packet_blob_oid: "74c42292f61dcf7e6033207c573a878f6f1ea64c"
execution_packet_bytes: 7879
execution_packet_sha256: "75fafecd9b5be4195aef83328bb5d18ab9f3bf33502a731d79a05c04287d9768"
execution_packet_payload_sha256: "0b925a72d24deb004112b0f847c8b70cc533f0d84a91f11eda78e435aefa097d"
```

CM-2094 synthetic record 只通过低披露回执绑定：

```yaml
receipt_review_reference: "CM-2094-ER-20260711-NATIVE-WRITE-RECEIPT-PASS-FD22CEC6"
receipt_commit: "91c20ce4c9b85966ef2da6b7c37563ebbce0f365"
receipt_blob_oid: "b310146b5219cb4db0e463275f10e8aae4d2f94a"
receipt_bytes: 3078
receipt_sha256: "fd22cec67c8d95eab2f95c10a52207529847d83942354331ba372f5edc41f277"

target_memory_id_ref: "vcp-kb-4f863f52455147c6"
target_record_bytes: 269
target_record_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"
```

## 唯一请求的 bootstrap 动作

未来若获得独立授权，只允许在机器绑定的 CM-2094 原 synthetic store root 中，
使用排他创建语义创建：

```text
.codex-memory-cm2096-store-identity.json
```

必须写入下列 minified UTF-8 字节，无 BOM、无末尾换行：

```json
{"expectedPostRollbackMarkdownCount":2,"expectedPreRollbackMarkdownCount":1,"rawPathDisclosureAllowed":false,"reinitializationAllowed":false,"replacementAllowed":false,"schemaVersion":1,"storeInstanceId":"cm2094-phase8-synthetic-native-store-001","storeReference":"cm2094-phase8-synthetic-native-write-store","storeRole":"cm2094_synthetic_native_write_store","syntheticOnly":true,"targetMemoryIdRef":"vcp-kb-4f863f52455147c6","targetRecordBytes":269,"targetRecordSha256":"4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828","writeSubdir":"codex-memory-governed"}
```

精确绑定：

```yaml
runtime_identity_bytes: 576
runtime_identity_sha256: "e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13"

git_template_commit: "1ba07b0cfab17da432a860e2c640569288e626e0"
git_template_blob_oid: "3d4ee2e174c9967afc59b179b15b1347505613e3"
git_template_file_bytes: 577
git_template_file_sha256: "771641f45588e5c58d068bd2ef3e7d48f0494a8871ee11329f5f5c3e076c6e33"
```

Git template 多出的 1 byte 是末尾换行；未来 runtime identity 必须使用上述
576-byte 规范字节，不能直接复制 577-byte Git 文件。

## 一次性与失败规则

请求的授权边界为：

```yaml
action: "initialize_cm2096_target_store_identity"
create_mode: "exclusive_create_only"
authorization_use_count: 1
authorization_replay_allowed: false
nonce: "cm2100-cm2096-target-store-bootstrap-001"
receipt_id: "cm2100-cm2096-target-store-bootstrap-receipt-001"
requested_expires_at: "2026-07-15T18:00:00+08:00"

max_bootstrap_identity_writes: 1
max_identity_readback_verifications: 1
max_target_record_reads: 0
max_target_store_directory_enumerations: 0
max_native_reads: 0
max_native_writes: 0
max_tombstone_writes: 0
max_verify_operations: 0
max_retries: 0
max_supersede_operations: 0
max_compensation_operations: 0
```

若 identity 文件已经存在，无论内容相同或不同，都必须停止：不读取正文、不覆盖、
不删除、不替换、不重新初始化，也不把既有文件登记为本次 bootstrap 成功。

若创建结果不明确，不得自动重试；必须停止并进入新的独立 reconciliation 流程。

## 必须由独立决定补齐的 store authority

当前 Git 证据只能证明 CM-2094 使用了 isolated runtime store，并绑定唯一
269-byte record；它没有冻结原 store 的低披露 root identity。

因此本申请明确记录：

```yaml
runtime_store_authority_binding_present_at_request: false
store_root_binding_sha256_present_at_request: false
cm2094_original_store_continuity_proven_at_request: false
clone_store_accepted_as_cm2094_original_store: false
```

独立审查者只有在能够补齐并精确绑定下列低披露对象时，才可签发 bootstrap
授权：

```yaml
runtime_store_authority_source: "<safe frozen authority>"
store_root_binding_sha256: "<safe stable binding>"
cm2094_original_store_continuity_accepted: true
raw_path_disclosed: false
```

如果审查面无法证明原 store 连续性，必须返回 `changes_required`；不得把内容相同
的 clone store 当成 CM-2094 原 store。

## Bootstrap 成功后允许的回执字段

只有获得未来独立授权并成功使用一次后，低披露 receipt 才可记录：

```yaml
bootstrap_authorization_consumed: true
bootstrap_authorization_replay_allowed: false
identity_created: true
identity_bytes: 576
identity_sha256: "e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13"
identity_readback_verifications: 1
target_record_reads: 0
target_store_directory_enumerations: 0
native_reads: 0
native_writes: 0
tombstone_writes: 0
verify_operations: 0
raw_path_disclosed: false
```

该 receipt 仍需新的独立复核。Bootstrap receipt 通过不自动授权 preflight、
tombstone、verify 或 Phase 8 completion。

## 当前零执行事实

```yaml
physical_target_store_state_observed: false
identity_created_by_this_request: false
preflight_performed_by_this_request: false
target_record_read_by_this_request: false
nonce_claimed_by_this_request: false
native_action_performed_by_this_request: false
remote_action_performed_by_this_request: false
```

## 申请对象哈希

```yaml
json_path: "docs/near-model-memory-plan-pack/phase8_target_store_identity_bootstrap_authorization_request_cm2100.json"
json_bytes: 6336
json_sha256: "03b54155f1033fff671b7f723acbb9b70a26183cec2263d0120161b7302d999f"
json_payload_sha256: "dbb1783ec35ce4eb90219f83b49c971217f8791233bb594fd3b7d4af9b534d10"
```

本申请不授权任何真实执行。下一步只允许把本申请冻结并提交独立审查。
