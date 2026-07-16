# codex-memory 外部审查第三次申请书（直接附件版）

申请日期：2026-07-11

申请事项：仅重新审查 `externalReviewPassed`

前次决定：`CM-2079-ER-20260711-FAIL-CLOSED-EVIDENCE-SURFACE-MISMATCH`

## 一、这次如何满足“直接附上文件”

本申请不再要求审查者从 dirty checkout、sibling worktree 或旧文件 diff
推导新证据。六个证据对象已经作为全新文件加入一个独立 attachment
commit：

```text
attachmentCommit=92364835112deb1957a7a03c3e9e846370a06853
attachmentTree=5a0ba6141f1f4c529faa8403241e6e97bbd9703b
```

该提交只新增附件文件。对 `attachmentCommit` 执行只读 `history_show` 即可
在单个小型 patch 中取得每个完整文件，不需要重建旧版本差异。

附件目录：

```text
docs/near-model-memory-plan-pack/external-review-attachments/cm2079/
```

## 二、运行时与证据提交分别绑定

```text
runtimeSourceCommit=1822d7e8492424cd4b8849d544df087cf9c8edad
runtimeSourceTree=bac696fac692509572ecd1ab889a5b3aedc4b9a6

evidenceCommit=c0b8c24eb89efdd76305dc725b5416f7ce46a3a1
evidenceTree=bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4

attachmentCommit=92364835112deb1957a7a03c3e9e846370a06853
attachmentTree=5a0ba6141f1f4c529faa8403241e6e97bbd9703b
```

- runtime source commit：实际 clean replay 加载的代码；
- evidence commit：生成后的正式 artifacts 和 canonical bundle；
- attachment commit：正式 artifacts 的 byte-for-byte 新路径副本，专供只读
  审查面完整读取。

三者职责不同，不再互相冒充。

## 三、直接附件及精确校验值

| 附件 | Blob OID | Bytes | SHA-256 |
|---|---|---:|---|
| `phase2_machine_execution_evidence_manifest.json` | `4ccc78ad3cdd2489d10ab0d6a680bbca9ce4e592` | 6937 | `9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03` |
| `windows_wsl_machine_smoke_receipt.json` | `83bca87e0c06a08046eb88d1fac55418c0ad37fd` | 795 | `60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d` |
| `phase9_machine_observation_artifact.json` | `d1dd18c797a76a208977dac4827bbc6b1007114e` | 3793 | `138ad75ed7d41d88c689544cac217ddfa6ef751f2fe586c997fa37163f18968d` |
| `external_review_conflict_resolution_report.md` | `4bef2d345276e7e027f73c9f4d80cafbab751613` | 1382 | `0e6c6f285c0f8f6caec80c46588ce78ae51829d5bdaa2498882b0fae42a96014` |
| `external_review_handoff_bundle_canonical.md` | `0206c750af2b5bac0a64d2e9e1d5a3da6ccf06d4` | 2767 | `e6d7baf4bf3329a2b78645877a1fdedd841513c9a117f1e8a64c62df4019e8fe` |
| `external_review_handoff_bundle_v2.json` | `f6edf04b9a5b4fcc37799248343fba60c6b4801b` | 2856 | `45fb4ecdd88ba2984072d2340333f7af0d05bb8fbd3ad72e0e8646a79dbc3a47` |

附件文件与 evidence commit 中的正式文件逐字节 `cmp` 一致。

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

## 五、持续非声明边界

- replay 使用 fixture provider 和 isolated derived store，不是 production
  provider proof；
- isolated derived-index write 不是 primary/native memory write；
- VCPToolBox native memory 继续是最终 memory intelligence owner；
- 默认 MCP 继续为五个 read/context/proposal 工具；
- `commit_memory_delta` 继续非公开、operator-only；
- 本申请不授权 Completion Audit application、Tag Approval、Phase 8 write、
  tag、push、release、deploy、cutover、production、RC_READY、complete V8 或
  完整计划包完成声明。
