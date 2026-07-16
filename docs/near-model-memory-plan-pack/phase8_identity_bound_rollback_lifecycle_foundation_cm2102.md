# CM-2102 Phase 8 Identity-bound Synthetic Rollback Lifecycle Foundation

本 foundation 只冻结路线 B 的身份、顺序和未来合同，不创建 store 或 identity，
不运行 preflight，不启动 runtime，也不执行任何 native memory action。

## Route decision

```yaml
decision_reference: "CM-2101-ER-20260711-HISTORICAL-BINDING-NOT-FOUND-ROUTE-B-SELECTED-E5CFF2D2"
decision_commit: "2dfd2e812c21df0afd5318bf9cd26c0eab639c2b"
decision_tree: "29b7e7b4d3846094afe2b9764574ae8e1af1d958"
decision_blob_oid: "3b268ae338f135440e21798b881c12d24f417cd0"
decision_bytes: 4276
decision_sha256: "b70b6d97297a17f29ff939d99bb3adc2061436fc20f4cf9168e18f862cb12628"
decision_payload_sha256: "c775576b5f30bd83ef42c2ca710f4a2a38815450b0fb27fa7010bcf88cda87ec"
```

## Frozen implementation

```yaml
implementation_commit: "cd082c12c9dd91d70cd34b22709615f102668aa7"
implementation_tree: "619f9610f52479a744c7a1d4cd0bb21ded19a2f6"

foundation_contract: "src/core/Cm2102IdentityBoundRollbackLifecycleFoundation.js"
foundation_contract_blob_oid: "321b9019c6484e3bd1e73f3f56a934980d3786e6"

empty_store_preflight_contract: "src/core/Cm2102IdentityBoundEmptyStorePreflightContract.js"
empty_store_preflight_contract_blob_oid: "906e8e76033329f3d2ca2e87afaadc4b2415968b"
```

Foundation contract 是纯函数，只验证 packet、identity、gate order 和零执行边界。
Empty-store preflight contract 只验证未来低披露 receipt 的精确 shape；合同本身
不会读取目录，也不会把测试 fixture 接受成实际 preflight evidence。

## Store identity

```yaml
lifecycle_reference: "phase8-identity-bound-rollback-lifecycle-001"
store_reference: "phase8-identity-bound-synthetic-rollback-store-001"
store_instance_id: "phase8-identity-bound-synthetic-rollback-store-instance-001"
store_role: "phase8_identity_bound_synthetic_rollback_store"
synthetic_only: true

identity_filename: ".codex-memory-cm2102-store-identity.json"
identity_template_file_bytes: 634
identity_template_file_sha256: "623fc13829e66d2b4be4d367c55180b688c0285085aeecff270b07792176b1c6"
identity_runtime_bytes: 633
identity_runtime_sha256: "017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57"

identity_present_before_first_native_write_required: true
replacement_allowed: false
reinitialization_allowed: false
physical_delete_allowed: false
```

Git template 多出的 1 byte 是末尾换行。未来 runtime identity 必须写入 633-byte
minified UTF-8 字节，无 BOM、无末尾换行。

## Store root authority

Store root 只能由当前 repository 的 Git common-dir 治理面派生：

```text
<git-common-dir>
→ codex-memory-governance
→ phase8-identity-bound-synthetic-rollback-store-001
```

不允许 caller path 或 environment path override。现有 governance root identity 必须
先匹配：

```yaml
governance_root_identity_reference: "codex-memory-phase8-governance-root"
governance_root_identity_sha256: "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0"
store_root_binding_canonical_bytes: 616
store_root_binding_canonical_sha256: "0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94"
raw_path_disclosure_allowed: false
```

## Frozen gate order

```text
identity bootstrap
→ bootstrap receipt review
→ empty-store read-only preflight
→ new synthetic record write
→ write receipt review
→ independent tombstone authorization
→ rollback receipt review
→ Completion Audit application
```

CM-2094 的 authorization、nonce、receipt、registry claim、record target 和 execution
packet 均不得复用。

## Empty-store preflight future shape

未来 preflight 必须有独立决定，并在 bootstrap receipt review 通过后证明：

```yaml
store_identity_matched: true
synthetic_store_empty: true
observed_markdown_count: 0
unexpected_entries: 0

identity_read_operations: 1
directory_enumeration_operations: 1
record_content_read_operations: 0
native_read_delegation_mode: "off"
native_read_calls: 0
native_write_performed: false
real_memory_read: false
provider_called: false
raw_path_disclosed: false
```

当前没有 preflight authorization 或 receipt。

## Current state

```yaml
foundation_prepared: true
bootstrap_request_prepared: true
empty_store_preflight_contract_implemented: true

store_identity_created: false
bootstrap_authorized: false
bootstrap_executed: false
empty_store_preflight_authorized: false
empty_store_preflight_executed: false
record_memory_authorized: false
record_memory_executed: false
tombstone_memory_authorized: false
tombstone_memory_executed: false
verify_authorized: false
verify_executed: false
nonce_claimed: false

native_reads: 0
native_writes: 0
rollback_or_compensation_operations: 0
rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```

## Packet hashes

```yaml
foundation_json_bytes: 5460
foundation_json_sha256: "d6ce7c743a6a0969e4468daf7577a8681b128eefc788b3412fbf4124bea72a70"
foundation_payload_sha256: "1739ce4bcbe870a6e41f845f8b0f30b943ceb17b671c857e9049161f13b47638"

bootstrap_request_json_bytes: 7096
bootstrap_request_json_sha256: "2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad"
bootstrap_request_payload_sha256: "60d153e913cf1b9f1873c6e5ac98e9dfa1cb35e142eebc701dfca13ac23784da"
```
