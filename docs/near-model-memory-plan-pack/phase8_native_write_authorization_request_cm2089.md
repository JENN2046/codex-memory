# codex-memory Phase 8 精确 Native Write 独立授权申请书（CM-2089）

申请日期：2026-07-11

## 只申请这一件事

申请在精确冻结、runtime-matched 的隔离 stdio MCP 环境中，执行一次
`record_memory` 原生写入，创建一个全新的 synthetic proof record，并执行
最多一次低披露 receipt correlation verify。

```yaml
phase8_native_write_authorized: false  # 本次申请改为 true
max_native_writes: 1
max_verify_operations: 1
max_rollback_or_compensation_operations: 0
proof_record_only: true
existing_memory_modification_allowed: false
raw_private_memory_access_allowed: false
default_mcp_expansion_allowed: false
```

## 冻结执行绑定

```yaml
runtime_source_commit: "66e6974cfc1f0225ac315f16bdd0aa4fa954fb51"
runtime_source_tree: "e60d90e6b9bc0ca52e4d841b4b50130b6ea2b53d"
clean_detached_checkout_required: true
runtime_head_must_equal_source_commit: true
stale_loaded_runtime_allowed: false
transport: "isolated_stdio_mcp"
primary_runtime: "VCPToolBox native memory"
runtime_target_reference: "cm2089-vcptoolbox-native-memory-target"
runtime_target_kind: "mcp_server"
```

运行时与 checkout 不一致、checkout 不干净或 target binding 不完整时，必须
停止，不得写入。

## 精确动作与 Payload

```yaml
tool: "record_memory"
exact_approval_action: "live_bridge_record_memory_proof"
payload_file: "docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json"
canonical_rendering: "docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.md"
payload_bytes: 638
payload_file_sha256: "3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245"
canonical_payload_sha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
```

该 payload 是明确标注为 non-production、非用户记忆的 synthetic proof
record。它只新增唯一 proof record，不修改、覆盖、tombstone 或 supersede
任何既有记忆；不得在 native 写入失败时转为 local fallback write。

## 单次 Approval Packet 请求

```yaml
token: "APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT"
allowed_action: "live_bridge_record_memory_proof"
expires_at: "2026-07-12T06:00:00+08:00"
nonce: "cm2089-phase8-record-memory-proof-001"
receipt_id: "cm2089-phase8-native-write-receipt-001"
expected_context_hash: "29668cd36b14b2d7e36e35463dcd7af0a1a1c1d01ba3b6aa94a32f6349ecc20a"
expected_allowlist_hash: "fd08575141c2ffdb501f24d4a8f525f660cc5919c1baeb1817697da164da956e"
authorization_use_count: 1
```

Scope 精确绑定为 `cm2089-phase8-native-write-proof-001`、项目
`codex-memory`、workspace `codex-memory-phase8-proof`、client `Codex`、
visibility `project`。

## Verify 与回执

写入成功后，只允许一次 `audit_memory_low_disclosure_receipt_correlation`
类别验证。不得读取原始记忆正文、原始 audit row、provider payload、endpoint、
locator、凭据或响应正文。

必须形成低披露回执，至少确认：exact approval enforcement、native side
effect、real-root durable write、verify、output disclosure budget 和 audit
receipt。该回执不会自动完成 Phase 8；rollback drill、failure recovery、
receipt application 和 Completion Audit patch 仍是后续独立 gate。

## Rollback / Compensation 边界

本申请不授权 rollback、tombstone、supersede 或 compensation：

```yaml
max_rollback_or_compensation_operations: 0
authorized_by_this_request: false
compensation_counts_as_native_write: true
post_commit_failure_disposition: "rollback_required_not_applied"
rollback_plan_reference: "cm2089-phase8-rollback-plan"
```

若 post-commit validation 失败，必须停止。任何补偿动作均视为新的原生写入，
需要新的 action-specific exact approval；不得自动重试或自动回滚。

## 明确不申请

本申请不授权修改既有真实记忆、raw/private access、默认 MCP 扩张、公开
`commit_memory_delta`、任何 Git 远端动作、Release、发布、deploy、cutover、
readiness、`RC_READY`、complete V8 或完整计划包完成声明。

## 建议决定格式

```yaml
phase8_native_write_authorized: true
decision_reference: "<独立精确 Phase 8 native write 授权编号>"
runtime_source_commit: "66e6974cfc1f0225ac315f16bdd0aa4fa954fb51"
runtime_source_tree: "e60d90e6b9bc0ca52e4d841b4b50130b6ea2b53d"
tool: "record_memory"
exact_approval_action: "live_bridge_record_memory_proof"
canonical_payload_sha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
expected_context_hash: "29668cd36b14b2d7e36e35463dcd7af0a1a1c1d01ba3b6aa94a32f6349ecc20a"
expected_allowlist_hash: "fd08575141c2ffdb501f24d4a8f525f660cc5919c1baeb1817697da164da956e"
expires_at: "2026-07-12T06:00:00+08:00"
nonce: "cm2089-phase8-record-memory-proof-001"
receipt_id: "cm2089-phase8-native-write-receipt-001"
authorization_use_count: 1
max_native_writes: 1
max_verify_operations: 1
max_rollback_or_compensation_operations: 0
```

## 当前效力

本文件仅为申请。当前 `phase8NativeWriteAuthorizationGranted=false`，没有
执行 runtime、native write、verify、rollback、compensation 或真实记忆读取。
