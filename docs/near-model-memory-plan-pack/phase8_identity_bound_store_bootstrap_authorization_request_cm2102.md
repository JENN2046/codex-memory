# CM-2102 Identity-bound Synthetic Store Bootstrap 独立授权申请

申请日期：2026-07-11

本申请只请求审查路线 B 新 synthetic store 的 Gate 1 bootstrap。它不创建目录或
identity，不运行 empty-store preflight，不启动 native runtime，不调用
`record_memory`、`tombstone_memory` 或 verify。

## Request state

```yaml
bootstrap_authorization_requested: true
bootstrap_authorization_currently_granted: false
bootstrap_may_execute_from_this_request: false
bootstrap_executor_implemented_at_request: false
separate_exact_bootstrap_decision_required: true

empty_store_preflight_authorization_requested: false
record_memory_authorization_requested: false
tombstone_memory_authorization_requested: false
verify_authorization_requested: false

store_identity_created: false
store_directory_created: false
nonce_claimed: false
native_reads: 0
native_writes: 0
rollbackDrillPassed: false
phase8Completed: false
```

申请通过只允许后续实现并冻结 exact bootstrap executor；本申请自身不能直接传入
任何执行入口。

## Route B binding

```yaml
route_decision_reference: "CM-2101-ER-20260711-HISTORICAL-BINDING-NOT-FOUND-ROUTE-B-SELECTED-E5CFF2D2"
route_decision_commit: "2dfd2e812c21df0afd5318bf9cd26c0eab639c2b"
route_decision_blob_oid: "3b268ae338f135440e21798b881c12d24f417cd0"
route_decision_sha256: "b70b6d97297a17f29ff939d99bb3adc2061436fc20f4cf9168e18f862cb12628"

foundation_implementation_commit: "cd082c12c9dd91d70cd34b22709615f102668aa7"
foundation_implementation_tree: "619f9610f52479a744c7a1d4cd0bb21ded19a2f6"
```

## Unique future action

未来独立决定只可授权一次：

```yaml
action: "initialize_identity_bound_synthetic_store"
authorization_use_count: 1
authorization_replay_allowed: false
nonce: "cm2102-identity-bound-store-bootstrap-001"
receipt_id: "cm2102-identity-bound-store-bootstrap-receipt-001"
requested_expires_at: "2026-07-15T18:00:00+08:00"
```

Store root 必须从 Git common-dir 治理面派生，不接受 caller path 或 environment
override：

```text
<git-common-dir>/codex-memory-governance/
phase8-identity-bound-synthetic-rollback-store-001
```

审查和回执不得披露展开后的物理路径。

## Governance root prerequisite

```yaml
governance_root_identity_reference: "codex-memory-phase8-governance-root"
governance_root_identity_sha256: "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0"
governance_root_identity_verification_required: true
governance_root_reinitialization_allowed: false
governance_root_replacement_allowed: false
parent_directory_must_already_exist: true
```

治理根缺失或漂移时必须在目录创建前停止。本申请不授权修复、替换或重新初始化
治理根。

## Exact directory and identity creation

```yaml
store_directory_create_mode: "exclusive_mkdir"
store_directory_must_be_absent: true
max_store_directory_creates: 1

identity_filename: ".codex-memory-cm2102-store-identity.json"
identity_create_mode: "exclusive_create_only"
identity_bytes: 633
identity_sha256: "017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57"
max_identity_writes: 1
max_identity_readback_verifications: 1

parent_directory_creation_allowed: false
identity_overwrite_allowed: false
identity_replacement_allowed: false
identity_reinitialization_allowed: false
identity_deletion_allowed: false
```

Store root binding：

```yaml
canonical_bytes: 616
sha256: "0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94"
```

该 binding 同时包含 governance root identity、lifecycle、store reference、store
instance ID 和 identity SHA。

## Failure handling

若 exact store directory 已经存在，必须停止：

* 不读取目录内容；
* 不读取或比较既有 identity；
* 不覆盖、删除、替换或重新初始化；
* 不把既有目录登记为本次 bootstrap 成功；
* 进入新的 reconciliation 决定。

若 bootstrap 结果不明确，不得自动重试，不得删除部分状态，不得继续运行
preflight。

## Exact zero boundaries

```yaml
max_directory_enumerations: 0
max_record_content_reads: 0
max_native_reads: 0
max_native_writes: 0
max_record_memory_calls: 0
max_tombstone_memory_calls: 0
max_verify_operations: 0
max_retries: 0

raw_memory_read: false
raw_audit_read: false
raw_path_disclosed: false
real_memory_read: false
real_memory_modified: false
provider_called: false
embedding_provider_called: false
remote_action_performed: false
```

Bootstrap 成功只允许生成低披露 receipt。Receipt 必须独立复核后，才能另行申请
Gate 2 empty-store preflight；不得从 bootstrap 推导 preflight 或 native write。

## Application object

```yaml
json_path: "docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_request_cm2102.json"
json_bytes: 7096
json_sha256: "2318692aec334acd75b54d9bdac71ada9a2c2d3d3255b76cf97a5095421927ad"
json_payload_sha256: "60d153e913cf1b9f1873c6e5ac98e9dfa1cb35e142eebc701dfca13ac23784da"
```

本申请不执行 bootstrap。下一步只能冻结并独立审查本 foundation 和 bootstrap
request。
