# codex-memory CM-2094 Phase 8 Final Execution Release 独立审查申请

本申请只请求独立审查并签发一次精确 final execution release。提交本申请时：

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: true
tagApprovalPacketPassed: true
phase8NativeWriteAuthorizationGranted: false

final_execution_release_authorized: false
native_write_may_execute_from_this_request: false
```

## 已通过的上游决定

内容决定：

```text
CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7
```

Registry root bootstrap 回执复核：

```text
CM-2093-ER-20260711-REGISTRY-ROOT-BOOTSTRAP-RECEIPT-PASS-BDD96776
```

Bootstrap 授权已经消费且不可重放。Registry root 已初始化；nonce、native
execution receipt、claim、write invocation、native write 和 verify 仍全部为零。

## 冻结 Execution Packet

```yaml
execution_packet_commit: "66cfae232b6609bbede9debc6f897f74ed8551c0"
execution_packet_tree: "88a4a6f92a9d380f568963604a8dbae3b9fe07c4"

execution_manifest_path: "docs/near-model-memory-plan-pack/phase8_frozen_execution_manifest.json"
execution_manifest_blob_oid: "549f157ed65d0675fccfb2c8b68698a31c4666f2"
execution_manifest_bytes: 5272
execution_manifest_sha256: "0786167ba860d869873fdc32dad167a411d7d85617e2c08b01c1d4604ba3131d"
execution_manifest_payload_sha256: "11bbbc72e4586654c0996d63090b586ec0da7bb4f2cccfc90b63af07cf31d0ee"
```

Manifest 只描述将来可能获准的一次执行，不授权执行本身。其当前状态明确为：

```yaml
manifestDoesNotAuthorizeExecution: true
phase8NativeWriteAuthorizationGranted: false
nativeWriteMayExecuteBeforeFinalRelease: false
```

## 申请的精确 Final Release 决定

如独立审查通过，请冻结一份 JSON 决定，其执行相关字段必须精确绑定：

```yaml
decisionReference: "CM-2094-ER-PHASE8-FINAL-EXECUTION-RELEASE-F1CF912C-B69CC85D"
executionReleaseAuthorized: true
phase8NativeWriteAuthorized: true
token: "APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT"
allowedAction: "live_bridge_record_memory_proof"

authorizationContentDecisionReference: "CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7"
authorizationContentSourceCommit: "aecc431de4533e1c3a0e9f42948b217f835b4c7e"
authorizationContentBlobOid: "bc251e7a34152b41724f3c098fee12baefe0f787"
authorizationContentPayloadSha256: "9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc"

executionPacketCommit: "66cfae232b6609bbede9debc6f897f74ed8551c0"
executionManifestBlobOid: "549f157ed65d0675fccfb2c8b68698a31c4666f2"
executionManifestSha256: "0786167ba860d869873fdc32dad167a411d7d85617e2c08b01c1d4604ba3131d"

expectedContextHash: "f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283"
expectedAllowlistHash: "b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20"
payloadCanonicalSha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"

nonce: "cm2093-phase8-record-memory-proof-001"
receiptId: "cm2093-phase8-native-write-receipt-001"
authorizationUseCount: 1
expiresAt: "2026-07-15T18:00:00+08:00"
```

`approvedAt` 应由独立审查决定按真实签发时间填写。任何字段漂移、决定过期或
Git intake 失败时，执行器必须停在 `UNCLAIMED`。

## 获批后仍受限的一次性边界

```yaml
max_native_writes: 1
max_verify_operations: 1
max_rollback_or_compensation_operations: 0

automatic_retry_allowed: false
automatic_rollback_allowed: false
existing_memory_modification_allowed: false
real_memory_read_allowed: false
local_fallback_write_allowed: false
```

写入结果若不明确，不得重试 `record_memory`。任何 rollback、tombstone、
supersede 或 compensation 都属于新的 native write，必须另行取得精确授权。

## 本申请明确不执行或授权

本申请不 claim nonce，不创建 native execution receipt，不启动写入 runtime，
不调用 `record_memory` 或 `audit_memory`，不执行 verify、rollback 或 compensation，
不读取或修改真实记忆，不扩大默认 MCP 工具面，也不授权 Git push、Release、
deploy、cutover、production readiness、`RC_READY` 或完整计划包完成声明。

只有独立 CM-2094 决定原始字节冻结进 Git、通过机器 intake，并且执行时全部
绑定仍然精确且未过期，第四个 decision slot 才可在该一次性执行授权语义下变为
`true`。本申请提交本身继续保持第四项为 `false`。
