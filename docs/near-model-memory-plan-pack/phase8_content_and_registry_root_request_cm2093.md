# codex-memory Phase 8 内容批准与治理根初始化申请（CM-2093）

申请日期：2026-07-11

前次决定：`CM-2092-ER-20260711-FAIL-CLOSED-FINAL-RELEASE-AND-REGISTRY-ROOT-INCOMPLETE`

本次不申请 native write 执行权。本次只申请：

1. 批准一份不可执行的 authorization content；
2. 批准一次精确的本地 registry root identity 初始化；
3. 明确保留后续独立 final execution release review。

最终状态必须继续是：

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: true
tagApprovalPacketPassed: true
phase8NativeWriteAuthorizationGranted: false
```

## 两项阻断修复

### 1. Registry root 不再依赖 `dataDir`

冻结执行器现在只从：

```text
git rev-parse --git-common-dir
→ codex-memory-governance/phase8-one-shot-authorization-registries
```

派生唯一治理根。切换 `CODEX_MEMORY_DATA_DIR` 不会改变 nonce/receipt registry。

执行器不会自动创建 root identity。文件缺失、内容漂移、instance ID 替换、
reinitialize/replacement 被允许时都会在 claim 前失败。

申请绑定的 root identity 为：

```yaml
registryRootInstanceId: "cm2093-phase8-governance-root-instance-001"
registryRootReference: "codex-memory-phase8-governance-root"
registryRootReinitializationAllowed: false
registryRootReplacementAllowed: false
canonical_sha256: "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0"
```

当前真实治理根尚未初始化。本申请允许的 root bootstrap 仍需在决定字节冻结后
通过单独的精确初始化步骤完成；不得覆盖已存在文件，不得删除或替换 root。

### 2. 内容批准与最终执行释放已机器分离

内容决定必须是：

```yaml
authorizationContentApproved: true
registryRootBootstrapAuthorized: true
phase8NativeWriteAuthorized: false
nativeWriteMayExecute: false
finalExecutionReleaseReviewRequired: true
```

Execution gate 现在同时要求：

```text
machine-bound content decision
+ machine-bound final execution release decision
```

缺少 final release、release 过期、复制对象丢失 intake identity、execution packet
commit 漂移、manifest blob/SHA-256 漂移时，均停在 `UNCLAIMED`。

最终 release 决定必须另行精确绑定：

```yaml
executionReleaseAuthorized: true
phase8NativeWriteAuthorized: true
authorizationContentDecisionReference: "<CM-2093 content decision>"
authorizationContentSourceCommit: "<exact commit>"
authorizationContentBlobOid: "<exact blob>"
authorizationContentPayloadSha256: "<exact sha256>"
executionPacketCommit: "<exact commit>"
executionManifestBlobOid: "<exact blob>"
executionManifestSha256: "<exact sha256>"
```

没有这份第二决定，frozen executor 不会读取 runtime 配置、初始化 app 或 claim
nonce。

## 冻结绑定

```yaml
runtime_source_commit: "10b1ea49257c0aa2c26e50a2291142093589d938"
runtime_source_tree: "f4273910483c096ff03d3c33f01c59187a2f6e2b"
payload_blob_oid: "cde8e314a118e52e4beb9181401ee0bc7cc1dc68"
payload_canonical_sha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
context_canonical_sha256: "f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283"
allowlist_canonical_sha256: "b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20"
registry_root_identity_canonical_sha256: "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0"
```

## 请求签发的不可执行内容决定

```yaml
decisionReference: "<reviewer-issued content decision reference>"
authorizationContentApproved: true
registryRootBootstrapAuthorized: true
registryRootIdentitySha256: "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0"
phase8NativeWriteAuthorized: false
nativeWriteMayExecute: false
finalExecutionReleaseReviewRequired: true
expectedFinalReleaseDecisionReference: "<reviewer-reserved exact future reference>"
allowedAction: "live_bridge_record_memory_proof"
expectedContextHash: "f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283"
expectedAllowlistHash: "b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20"
payloadCanonicalSha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
nonce: "cm2093-phase8-record-memory-proof-001"
receiptId: "cm2093-phase8-native-write-receipt-001"
authorizationUseCount: 1
expiresAt: "2026-07-15T18:00:00+08:00"
approvedAt: "<reviewer-issued timestamp>"
```

## 当前无执行事实

验证结果：Phase 8/MCP 聚焦回归 `124/124`，默认测试 `5166/5166`；严格
mainline contract `106/106`、compare `43/43`、rollback `43/43` 全部通过。
全部真实写入计数仍为零。

```yaml
registry_root_initialized: false
authorization_claims: 0
native_writes: 0
verify_operations: 0
rollback_or_compensation_operations: 0
real_memory_reads: 0
```

本申请不授权 native write、verify、nonce claim、执行 receipt、rollback、
compensation、自动重试、真实记忆读取或修改、远端 Git 动作、release、deploy、
cutover、默认 MCP 扩张或 readiness 声明。
