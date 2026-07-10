# codex-memory Tag Approval Packet 独立审查申请书（CM-2083）

申请日期：2026-07-11

## 申请事项

现提交真实、冻结、机器可校验的 Tag Approval Packet，只申请独立决定第三个
decision slot：

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: true
tagApprovalPacketPassed: false  # 本次申请改为 true
phase8NativeWriteAuthorizationGranted: false
```

## Packet 绑定

```yaml
candidate_tag: "v0.2.0-readonly-context-rc"
milestone: "readonly_context"
target_commit: "170ee33963cd0a41565625b41418d12702dd221b"
target_tree: "c3e12feb3ab338f4eabaa3964483d2d8b1f43b33"
packet_payload_sha256: "c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43"
release_notes_sha256: "e429fe2a5cc537b2e168c531b79666b1cb5b1ec5bd5aaef26ec4cbab3ec5d90e"
completion_audit_application_receipt_sha256: "b74dd9ad7077754e98aaff266d62bd1a25223eb392d35108e5926a9eca16cfeb"
canonical_payload_sha256: "2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2"
```

审查对象：

- `tag_approval_packet_cm2083.json`
- `tag_candidate_release_notes_cm2083.md`

## 审查请求

请独立复核：

1. candidate tag 符合 `readonly-context-rc` 命名规则且没有禁止片段；
2. target commit/tree 精确存在且绑定 CM-2082 application；
3. CM-2080 外审与 CM-2081 application 决定链完整；
4. release-note non-claims 内容与 SHA-256 一致；
5. packet payload 递归键排序 SHA-256 一致；
6. 默认 MCP 仍为五个 read/context/proposal 工具；
7. `commit_memory_delta` 仍非公开、operator-only；
8. Tag Approval、tag 创建、tag push、release、deploy、cutover 和 readiness
   仍是不同的授权边界。

## 明确不申请

本申请不请求或授权：

- 创建 Git tag；
- push tag 或任何分支；
- GitHub Release 或软件包发布；
- deploy、cutover 或 production/release/`RC_READY` 声明；
- Phase 8 native write、rollback 或 compensation；
- 修改真实记忆；
- 默认 MCP 工具面扩张或公开 `commit_memory_delta`。

即使 `tagApprovalPacketPassed=true`，实际 `git tag` 与 tag push 仍必须分别取得
精确操作授权，不得从 packet approval 自动推导。

## 建议决定格式

```yaml
externalReviewPassed: true
externalReviewEvidenceBundleAppliedToCompletionAudit: true
tagApprovalPacketPassed: true
phase8NativeWriteAuthorizationGranted: false

decision_reference: "<独立 Tag Approval Packet 决定编号>"
candidate_tag: "v0.2.0-readonly-context-rc"
target_commit: "170ee33963cd0a41565625b41418d12702dd221b"
packet_payload_sha256: "c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43"
tag_creation_authorized: false
tag_push_authorized: false
```

## 当前效力

本文件只是独立审查申请。收到明确决定前，`tagApprovalPacketPassed` 继续为
`false`；当前没有 tag 被创建或推送。
