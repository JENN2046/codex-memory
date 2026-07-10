# CM-2079 外部审查重新申请决定记录

决定引用：`CM-2079-ER-20260711-FAIL-CLOSED-EVIDENCE-SURFACE-MISMATCH`

## 决定

```yaml
externalReviewPassed: false
externalReviewEvidenceBundleAppliedToCompletionAudit: false
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
reason_code: REQUESTED_FROZEN_EVIDENCE_OBJECTS_NOT_INDEPENDENTLY_RETRIEVABLE
```

## 审查者确认的绑定

审查者确认申请中的 source commit、source tree、canonical payload hash 和
四份证据 hash 已被请求，但当前只读审查面无法直接取得对应的新产物。

主要问题：

- `1822d7e8…` 是 clean runtime-source/generator-order commit，但该提交中的
  tracked canonical bundle 仍是旧版本；
- 新证据实际存在于后续 evidence commit，而重新申请没有区分 runtime
  source commit 与 evidence artifact commit；
- 已登记项目仍指向 dirty `main@ddfc67d2…`，无法把 sibling worktree 当作
  直接审查面；
- 仅列出 SHA-256 声明不足以独立读取并复算证据对象。

## 效力

本决定保持四项 false，不授权 Completion Audit 应用、Tag Approval、Phase
8 native write、tag、push、release、deploy、cutover 或 readiness 声明。

## 修正路线

CM-2080 使用双提交绑定：

```text
runtimeSourceCommit=1822d7e8492424cd4b8849d544df087cf9c8edad
evidenceCommit=c0b8c24eb89efdd76305dc725b5416f7ce46a3a1
```

对六个证据对象分别绑定 Git object ref、blob OID、字节数和 SHA-256，且已
确认 `evidenceCommit` 可从当前已登记仓库的共享 Git object database 读取。
