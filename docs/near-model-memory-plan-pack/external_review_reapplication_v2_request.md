# codex-memory 外部审查第二次重新申请书

申请日期：2026-07-11

申请事项：仅重新审查 `externalReviewPassed`

决定基线：`CM-2079-ER-20260711-FAIL-CLOSED-EVIDENCE-SURFACE-MISMATCH`

## 一、修正说明

上次申请错误地把 runtime source commit 同时当成 evidence artifact commit。
本次明确拆分：

```text
runtimeSourceCommit=1822d7e8492424cd4b8849d544df087cf9c8edad
runtimeSourceTree=bac696fac692509572ecd1ab889a5b3aedc4b9a6

evidenceCommit=c0b8c24eb89efdd76305dc725b5416f7ce46a3a1
evidenceTree=bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4
```

`runtimeSourceCommit` 是执行 clean replay 时加载的代码提交；
`evidenceCommit` 是保存 replay 产物、canonical bundle 和最终状态同步的
提交。二者职责不同，不再声称证据产物已经存在于 runtime source commit。

已从当前登记仓库验证：`evidenceCommit` 和 `evidenceTree` 可直接通过共享
Git object database 读取。

## 二、机器可读对象清单

完整清单：

`docs/near-model-memory-plan-pack/external_review_git_object_evidence_manifest.json`

审查者可以直接读取下列 Git object refs：

```text
c0b8c24eb89efdd76305dc725b5416f7ce46a3a1:docs/near-model-memory-plan-pack/phase2_machine_execution_evidence_manifest.json
c0b8c24eb89efdd76305dc725b5416f7ce46a3a1:docs/near-model-memory-plan-pack/windows_wsl_machine_smoke_receipt.json
c0b8c24eb89efdd76305dc725b5416f7ce46a3a1:docs/near-model-memory-plan-pack/phase9_machine_observation_artifact.json
c0b8c24eb89efdd76305dc725b5416f7ce46a3a1:docs/near-model-memory-plan-pack/external_review_conflict_resolution_report.md
c0b8c24eb89efdd76305dc725b5416f7ce46a3a1:docs/near-model-memory-plan-pack/external_review_handoff_bundle_canonical.md
c0b8c24eb89efdd76305dc725b5416f7ce46a3a1:docs/near-model-memory-plan-pack/external_review_handoff_bundle_v2.json
```

每个对象均在 manifest 中绑定 blob OID、精确字节数和 SHA-256。审查者无需
信任当前 dirty checkout，也无需访问 sibling worktree，即可通过 Git object
读取原始字节并独立复算。

## 三、核心哈希

```text
canonicalPayloadSha256=2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2
phase2Sha256=9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03
windowsWslSha256=60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d
phase9Sha256=138ad75ed7d41d88c689544cac217ddfa6ef751f2fe586c997fa37163f18968d
conflictReportSha256=0e6c6f285c0f8f6caec80c46588ce78ae51829d5bdaa2498882b0fae42a96014
canonicalMarkdownSha256=e6d7baf4bf3329a2b78645877a1fdedd841513c9a117f1e8a64c62df4019e8fe
canonicalBundleJsonSha256=45fb4ecdd88ba2984072d2340333f7af0d05bb8fbd3ad72e0e8646a79dbc3a47
```

## 四、请求的决定

```yaml
externalReviewPassed: <true|false>
externalReviewEvidenceBundleAppliedToCompletionAudit: false
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
```

本申请仅请求第一项。后三项不得随本决定改变。

## 五、持续边界

- fixture-backed replay 不是 production-provider proof；
- isolated derived-index writes 不是 primary/native memory writes；
- VCPToolBox native memory 继续是最终 memory intelligence owner；
- 默认 MCP 继续严格为五个 read/context/proposal 工具；
- `commit_memory_delta` 继续非公开、operator-only；
- 不授权 Completion Audit application、Tag Approval、Phase 8 write、tag、
  push、release、deploy、cutover、production、RC_READY 或完整计划包完成。
