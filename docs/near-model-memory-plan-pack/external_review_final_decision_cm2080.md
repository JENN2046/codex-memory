# codex-memory 外部审查最终决定登记（CM-2080）

登记日期：2026-07-11

决定引用：`CM-2080-ER-20260711-PASS-F440C1BD-2215BB33`

## 四项独立决定

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: false
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
```

本次只把第一项从 `false` 改为 `true`。后三项没有被推导、代替或授权。

## 精确绑定

- 最终申请 commit：`f440c1bd76f6d6ee043e313b486f77731c55d964`
- JSON 等价 Markdown commit：`2d69365fafb026efec48024ec22e3cc4e2f095d4`
- 直接附件 commit：`92364835112deb1957a7a03c3e9e846370a06853`
- runtime source commit/tree：`1822d7e8492424cd4b8849d544df087cf9c8edad` / `bac696fac692509572ecd1ab889a5b3aedc4b9a6`
- evidence commit/tree：`c0b8c24eb89efdd76305dc725b5416f7ce46a3a1` / `bf5bbdaf47a7f05988d8e8d1b8ab4479e1a65ae4`
- canonical payload SHA-256：`2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2`

六个证据对象的字节数、Git blob OID 和 SHA-256 保存在同目录的
`external_review_final_decision_cm2080.json`，作为机器可校验登记。

## 通过效力

外部审查接受的是上述精确冻结对象。Phase 2 的三次受治理原生读取、
Windows/WSL smoke、Phase 9 实际 `initialize + tools/list`、冻结测试记录、
canonical payload 和 31/31 聚焦契约重放构成本次通过依据。

默认 MCP 工具面继续严格保持：

```text
audit_memory
memory_overview
prepare_memory_context
propose_memory_delta
search_memory
```

`commit_memory_delta` 继续非公开、operator-only。fixture embedding provider
不构成 production-provider proof；isolated derived-index writes 不构成
primary/native memory writes，也不构成 Phase 8 proof。VCPToolBox 继续作为最终
memory intelligence owner。

## 未获授权事项

本决定没有执行或授权 Completion Audit application，没有接受 Tag Approval
Packet，没有授权 Phase 8 native write，也没有授权 tag、push、release、deploy
或 cutover。它不构成 production/release readiness、`RC_READY`、complete V8
或完整计划包完成声明。

独立环境中完整 `gate:ci` 超过 180 秒被终止；该环境中止既不记作产品失败，
也不作为本次通过依据。
