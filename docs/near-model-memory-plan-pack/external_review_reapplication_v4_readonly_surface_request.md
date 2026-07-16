# codex-memory 外部审查最终重新申请书（只读审查面兼容版）

申请日期：2026-07-11

申请事项：仅重新审查 `externalReviewPassed`

前次决定：`CM-2079-ER-20260711-FAIL-CLOSED-EVIDENCE-SURFACE-MISMATCH`

## 一、审查入口

本申请已经针对 ColaMeta 只读 `history_show` 会跳过 JSON 文件的行为进行
兼容。审查者只需读取以下三个提交：

```text
申请提交：由本文件所在 commit 提供

JSON 内容等价 Markdown 提交：
2d69365fafb026efec48024ec22e3cc4e2f095d4

canonical/conflict 直接附件提交：
92364835112deb1957a7a03c3e9e846370a06853
```

已通过登记项目 `codex-memory` 的 ColaMeta `manage_git/history_show` 实测：

```text
commit=2d69365fafb026efec48024ec22e3cc4e2f095d4
skipped_files=null
phase2CompletionDerivation present=true
cmdBridge present=true
validationExecutionRecords present=true
runtimeSourceCommit present=true
```

因此审查者不需要读取 JSON 文件、不需要信任 dirty checkout，也不需要访问
sibling worktree。

## 二、提交职责

```text
runtimeSourceCommit=1822d7e8492424cd4b8849d544df087cf9c8edad
runtimeSourceTree=bac696fac692509572ecd1ab889a5b3aedc4b9a6

evidenceCommit=c0b8c24eb89efdd76305dc725b5416f7ce46a3a1
evidenceTree=bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4

directAttachmentCommit=92364835112deb1957a7a03c3e9e846370a06853
renderedJsonCommit=2d69365fafb026efec48024ec22e3cc4e2f095d4
renderedJsonTree=7a9c549ea39a3f7d13c16203b667a7e988d93549
```

- `runtimeSourceCommit`：clean replay 加载的代码；
- `evidenceCommit`：正式机器产物；
- `directAttachmentCommit`：canonical Markdown、冲突报告和原字节附件；
- `renderedJsonCommit`：三个 JSON 的内容等价 Markdown，只读接口可完整读取。

## 三、内容等价规则

以下三个 rendered Markdown 文件的 `json` fence 内 UTF-8 字节（包括 closing
fence 前的最后一个 LF）与源 JSON byte-for-byte 相同：

```text
docs/near-model-memory-plan-pack/external-review-attachments/cm2079/phase2_machine_execution_evidence_manifest.rendered.md
docs/near-model-memory-plan-pack/external-review-attachments/cm2079/windows_wsl_machine_smoke_receipt.rendered.md
docs/near-model-memory-plan-pack/external-review-attachments/cm2079/phase9_machine_observation_artifact.rendered.md
```

本地提取后 `cmp` 和 SHA-256 复算结果：

```text
phase2 bytes=6937
sha256=9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03

windows_wsl bytes=795
sha256=60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d

phase9 bytes=3793
sha256=138ad75ed7d41d88c689544cac217ddfa6ef751f2fe586c997fa37163f18968d
```

从 `directAttachmentCommit` 读取：

```text
external_review_conflict_resolution_report.md
sha256=0e6c6f285c0f8f6caec80c46588ce78ae51829d5bdaa2498882b0fae42a96014

external_review_handoff_bundle_canonical.md
sha256=e6d7baf4bf3329a2b78645877a1fdedd841513c9a117f1e8a64c62df4019e8fe
```

Canonical payload SHA-256：

```text
2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2
```

## 四、请求决定

```yaml
externalReviewPassed: <true|false>
externalReviewEvidenceBundleAppliedToCompletionAudit: false
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
```

只请求第一项。后三项不得改变。

## 五、持续边界

- fixture replay 不是 production-provider proof；
- isolated derived-index writes 不是 primary/native memory writes；
- VCPToolBox native memory 继续是最终 memory intelligence owner；
- 默认 MCP 保持五个 read/context/proposal 工具；
- `commit_memory_delta` 保持非公开、operator-only；
- 不授权 Completion Audit application、Tag Approval、Phase 8 write、tag、
  push、release、deploy、cutover、production、RC_READY、complete V8 或完整
  计划包完成。
