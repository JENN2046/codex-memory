# CM-2094 Phase 8 Native Write Execution Receipt

本回执记录 CM-2094 一次性授权的执行结果。它是低披露执行证据，不包含原始
记忆、原始 audit row、文件系统路径、endpoint、token、provider payload 或原始
请求/响应正文。

## 决定与 Packet 绑定

```yaml
decision_reference: "CM-2094-ER-PHASE8-FINAL-EXECUTION-RELEASE-F1CF912C-B69CC85D"
decision_commit: "f1e2a8302e91b75beffeb418f57e591cf0789401"
decision_tree: "1c5292b06ca1f04bcc8e1c5e34a156d4668becf7"
decision_blob_oid: "a53c053ab1b882b0d6927152a0d3ee6db540296a"
decision_bytes: 1325
decision_sha256: "db9dd1cc6f884806e8ea0337e3d09765608fa0892ad7f29011d822805c1c0ccf"

execution_packet_commit: "66cfae232b6609bbede9debc6f897f74ed8551c0"
execution_manifest_blob_oid: "549f157ed65d0675fccfb2c8b68698a31c4666f2"
execution_manifest_sha256: "0786167ba860d869873fdc32dad167a411d7d85617e2c08b01c1d4604ba3131d"
execution_manifest_payload_sha256: "11bbbc72e4586654c0996d63090b586ec0da7bb4f2cccfc90b63af07cf31d0ee"
```

## 执行结果

```yaml
result: accepted
final_state: CONSUMED_SUCCESS

authorization_use_count: 1
authorization_consumed: true
authorization_replay_allowed: false

nonce_marker_count: 1
authorization_receipt_marker_count: 1
claim_count: 1
write_invocation_marker_count: 1
write_invocation_count: 1

native_write_calls: 1
verify_operations: 1
verify_accepted: true

native_write_performed: true
durable_write_performed: true
primary_memory_store_write_performed: true
native_invocation_receipt_binding_matched: true
local_audit_receipt_appended: true
local_fallback_used: false
```

Nonce、receipt 与 claim 只记录安全哈希：

```yaml
nonce_sha256: "75537f8e8dd90d8464a44e74ea2a0e5141653887a6fe42dc42bd68d1102b7734"
receipt_id_sha256: "fb50b62eb71f0b6ac0514a287a902a596c348b5c1b0edaad3efeccad6f4d70f4"
claim_binding_hash: "593dc58545bb3c8340abc2acb85d8a0c1b7e734cde22fab7b442a500c3c88587"
claim_id_sha256: "1a7284f38bea3c0ffc70fee47e2e594bb55f83c36e444a0223e2464e8fb128cb"
```

## Durable Record 复核

执行后只读复核确认唯一 synthetic durable Markdown：

```yaml
record_count: 1
bytes: 269
sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"
```

该 SHA-256 与获批 manifest 精确一致。使用了隔离 runtime store，但 primary
Markdown write 是本次受控 native write；任何派生索引副作用不被计为本次 native
write proof。

## 保留边界

```yaml
raw_memory_returned: false
raw_audit_returned: false
raw_memory_read_performed: false
provider_api_called_for_native_write: false

automatic_retry_performed: false
rollback_or_compensation_performed: false
existing_memory_modified: false

default_mcp_expanded: false
commit_memory_delta_public: false
remote_action_performed: false
readiness_claimed: false

phase8_completed: false
full_plan_pack_completed: false
```

授权已消费，不得再次调用 `record_memory`，不得删除或重建 nonce、receipt、claim
或 write-invocation marker。任何 rollback、tombstone、supersede 或 compensation
仍需新的 action-specific 授权。

本回执必须接受新的独立复核。`CONSUMED_SUCCESS` 不自动代表 Phase 8 完成、
production/release readiness、`RC_READY`、complete V8 或完整计划包完成。
