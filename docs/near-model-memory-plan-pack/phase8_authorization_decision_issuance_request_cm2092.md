# codex-memory Phase 8 精确授权决定内容签发申请（CM-2092）

申请日期：2026-07-11

前次决定：`CM-2091-ER-20260711-FAIL-CLOSED-ONE-SHOT-AND-VERIFY-CORRELATION-INCOMPLETE`

本次只申请审查并签发一份精确的 Phase 8 授权决定内容，不申请立即执行
`record_memory`。本申请本身继续保持第四个 decision slot 为 `false`，不允许
claim nonce、创建执行 receipt、启动执行 runtime、执行 write 或 verify。

## 为什么拆成两道 gate

CM-2091 要求执行 gate 机器绑定外部决定的精确 reference、source commit、blob
OID 和 payload SHA-256。这些值只有在外部审查者先签发决定、项目再把决定原始
字节冻结进 Git 后才存在。因此正确顺序必须是：

```text
CM-2092 决定内容审查与签发（仍不可执行）
→ 冻结决定原始字节并复算 commit/blob/SHA-256
→ 生成最终 execution manifest
→ 单独的最终执行释放审查
→ 只有最终审查通过才可把第四个 decision slot 改为 true
```

不得用本申请或 CM-2092 内容决定直接执行 native write。

## 已完成的五项修复

1. 首次内部 assertion 验证会原子执行
   `CLAIMED → WRITE_INVOCATION_CONSUMED`。真实 app 的两个并发调用只有一个
   可以进入 native bridge，后续串行重放也会失败。
2. Bridge audit receipt 现在携带低披露的 receipt reference、外部决定引用、
   claim binding hash 和 target reference。`audit_memory` 在内部按精确 scope
   fingerprint 过滤，只返回 `scopeFingerprintMatched=true`，不泄露 fingerprint。
3. 冻结执行入口只接受一个 40 位 execution packet commit，不接收
   `executeNativeWrite`、`verifyWrite` callback 或 registry path。它从 Git object
   读取 payload 和决定，随后使用真实 app → local HTTP MCP → write-enabled shim
   → `audit_memory` 路径。
4. Registry 目录由固定治理根目录和 `authorizationRegistryReference` 哈希派生；
   identity 会持久化，禁止 reinitialize/delete，并已进入 context hash。
5. Execution gate 只接受经过 Git decision intake 的同一对象。克隆对象、替换
   reference、blob、commit 或 payload hash，即使公开 token 和其他 hash 不变，
   也会 fail closed。

## 冻结实现与证据绑定

```yaml
runtime_source_commit: "e1785994f599f2ef4c4bcf891bbf1e2b34f0630c"
runtime_source_tree: "c6205686a8e9bbc4171eaea516567336ad70cf42"
payload_blob_oid: "cde8e314a118e52e4beb9181401ee0bc7cc1dc68"
payload_file_sha256: "3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245"
payload_canonical_sha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
context_canonical_sha256: "75832f193a1a414ccabcd508fa8dc7d3f8d5afb3f7360184734c21d2647229fc"
allowlist_canonical_sha256: "b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20"
durable_record_bytes: 269
durable_record_sha256: "4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828"
```

## 请求签发的决定内容

请独立审查者返回一份可规范序列化为 JSON 的决定对象，至少精确包含：

```yaml
decisionReference: "<reviewer-issued exact reference>"
phase8NativeWriteAuthorized: true
token: "APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT"
allowedAction: "live_bridge_record_memory_proof"
expectedContextHash: "75832f193a1a414ccabcd508fa8dc7d3f8d5afb3f7360184734c21d2647229fc"
expectedAllowlistHash: "b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20"
payloadCanonicalSha256: "91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee"
nonce: "cm2092-phase8-record-memory-proof-001"
receiptId: "cm2092-phase8-native-write-receipt-001"
authorizationUseCount: 1
expiresAt: "2026-07-14T18:00:00+08:00"
approvedAt: "<reviewer-issued timestamp>"
```

该内容决定还必须明确：

```yaml
authorization_content_approved: true
native_write_may_execute_from_content_decision: false
final_execution_release_review_required: true
rollback_or_compensation_authorized: false
automatic_retry_authorized: false
```

## 测试证据与边界

聚焦路径覆盖真实 app、真实 local HTTP MCP shim、临时 synthetic durable Markdown
和真实 `audit_memory` 精确关联；所有临时文件在测试结束后删除。它不是 live
runtime proof，也不是 production-provider proof。

默认测试：`5157/5157` 通过。聚焦 MCP/Phase 8 回归：`117/117` 通过。

`gate:mainline:strict` 全部通过：contract `106/106`、默认测试 `5157/5157`、
compare `43/43`、rollback `43/43`。HTTP 写路径测试通过显式 `full` fixture
surface 运行；产品默认五工具面未扩大。

## 当前效力

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: true
tagApprovalPacketPassed: true
phase8NativeWriteAuthorizationGranted: false

authorization_claims: 0
native_writes: 0
verify_operations: 0
rollback_or_compensation_operations: 0
real_memory_reads: 0
```

本申请不授权真实记忆读取或修改、rollback、compensation、tag、push、release、
deploy、cutover、默认 MCP 扩张、`commit_memory_delta` 公开或任何 readiness 声明。
