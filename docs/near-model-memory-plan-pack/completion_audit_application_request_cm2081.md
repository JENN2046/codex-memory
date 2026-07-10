# codex-memory Completion Audit 证据应用申请书（CM-2081）

申请日期：2026-07-11

## 申请事项

现申请对已经独立通过的 CM-2080 外部审查证据执行一次受控的 Completion
Audit application，并只重新决定下面第二个 decision slot：

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: false  # 本次申请改为 true
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
```

申请依据的外部决定引用为：

```text
CM-2080-ER-20260711-PASS-F440C1BD-2215BB33
```

绑定的 canonical payload SHA-256 为：

```text
2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2
```

完整 commit、tree、blob、字节数和 SHA-256 绑定见：

- `external_review_final_decision_cm2080.json`
- `external_review_final_decision_cm2080.md`

## 请求批准的精确动作

仅批准以下一次受控应用：

1. 运行既有 external review bundle application gate；
2. 使用 CM-2080 的精确外审决定与冻结证据绑定生成 application receipt；
3. 运行既有 Completion Audit patch boundary/application contract；
4. 只把 `externalReviewEvidenceBundleAppliedToCompletionAudit` 写入 Completion
   Audit 证据面并生成低披露回执；
5. 验证应用后仍保持 `tagApprovalPacketPassed=false`、
   `phase8NativeWriteAuthorizationGranted=false`，且没有阶段完成或 readiness
   概括性声明。

## 明确不申请的动作

本申请不请求：

- 接受 Tag Approval Packet；
- Phase 8 native write、补偿写或 rollback；
- 修改任何真实记忆；
- 扩大默认 MCP 工具面或公开 `commit_memory_delta`；
- tag、push、release、deploy、cutover；
- production/release readiness、`RC_READY`、complete V8 或完整计划包完成声明。

## 建议决定格式

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: true
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false

decision_reference: "<独立 application 决定编号>"
applied_external_review_decision_reference: "CM-2080-ER-20260711-PASS-F440C1BD-2215BB33"
applied_canonical_payload_sha256: "2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2"
```

## 当前效力

本文件只是申请书，不执行 application。收到明确的独立应用决定并完成受控
patch application 与回执验证之前，第二项继续保持 `false`。
