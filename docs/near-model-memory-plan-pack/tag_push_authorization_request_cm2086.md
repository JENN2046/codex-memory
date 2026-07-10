# codex-memory 精确 Tag Push 独立授权申请书（CM-2086）

申请日期：2026-07-11

## 申请事项

基于已复核通过的本地 tag 创建回执，现只申请一次精确 tag push：

```yaml
tag_push_authorized: false  # 本次申请改为 true
branch_push_authorized: false
release_creation_authorized: false
release_publication_authorized: false
package_publication_authorized: false
deploy_authorized: false
cutover_authorized: false
phase8_native_write_authorized: false
```

## 精确 Push 绑定

```yaml
remote_name: "origin"
remote_url: "git@github.com:JENN2046/codex-memory.git"
source_ref: "refs/tags/v0.2.0-readonly-context-rc"
destination_ref: "refs/tags/v0.2.0-readonly-context-rc"
tag_name: "v0.2.0-readonly-context-rc"
tag_object_oid: "baf7eccee586979c08a6f63eead3c8e581d55e3c"
tag_signed: false
tag_annotation: "codex-memory readonly-context RC candidate; not RC_READY; no release authorization"
peeled_commit: "170ee33963cd0a41565625b41418d12702dd221b"
target_tree: "c3e12feb3ab338f4eabaa3964483d2d8b1f43b33"
packet_payload_sha256: "c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43"
tag_approval_decision_reference: "CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4"
tag_creation_authorization_reference: "CM-2084-ER-20260711-LOCAL-ANNOTATED-TAG-CREATE-C06836B4"
receipt_payload_sha256: "b6c2a597f109ca4a17f10dde88d505f81caf892ee607eb35b562693e77e7d3d0"
receipt_review_reference: "CM-2085-ER-20260711-LOCAL-TAG-RECEIPT-PASS-BAF7ECCE"
force_allowed: false
push_all_tags_allowed: false
authorization_use_count: 1
```

## 授权后允许的唯一流程

1. 即时重新验证 remote 名称和 URL、local tag object OID、peeled commit、
   target tree、annotation 和未签名状态；
2. 只读检查目标 remote ref 当前不存在；若存在则停止，不覆盖；
3. 仅 push 精确 refspec
   `refs/tags/v0.2.0-readonly-context-rc:refs/tags/v0.2.0-readonly-context-rc`；
4. push 后只读验证远端 ref 精确解析到获批目标；
5. 记录低披露 push receipt，并将一次性授权标记为已消费。

不得使用 `--force`、`--tags`、通配符 refspec，也不得附带 branch push。
验证失败时停止；删除、覆盖或修复远端 tag 需要新的明确授权。

## 明确不申请

本申请不授权：

- 任何 branch push；
- 其他 tag 或全部 tag push；
- 删除、覆盖或 retarget 本地/远端 tag；
- GitHub Release、软件包或制品发布；
- deploy、cutover；
- Phase 8 native write、rollback 或 compensation；
- 修改真实记忆、扩张默认 MCP 或公开 `commit_memory_delta`；
- production/release readiness、`RC_READY`、complete V8 或完整计划包完成声明。

## 建议决定格式

```yaml
tag_push_authorized: true
branch_push_authorized: false
release_creation_authorized: false
release_publication_authorized: false
package_publication_authorized: false
deploy_authorized: false
cutover_authorized: false
phase8_native_write_authorized: false

decision_reference: "<独立精确 tag push 授权编号>"
remote_name: "origin"
remote_url: "git@github.com:JENN2046/codex-memory.git"
source_ref: "refs/tags/v0.2.0-readonly-context-rc"
destination_ref: "refs/tags/v0.2.0-readonly-context-rc"
tag_object_oid: "baf7eccee586979c08a6f63eead3c8e581d55e3c"
tag_signed: false
tag_annotation: "codex-memory readonly-context RC candidate; not RC_READY; no release authorization"
peeled_commit: "170ee33963cd0a41565625b41418d12702dd221b"
target_tree: "c3e12feb3ab338f4eabaa3964483d2d8b1f43b33"
packet_payload_sha256: "c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43"
tag_approval_decision_reference: "CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4"
tag_creation_authorization_reference: "CM-2084-ER-20260711-LOCAL-ANNOTATED-TAG-CREATE-C06836B4"
receipt_payload_sha256: "b6c2a597f109ca4a17f10dde88d505f81caf892ee607eb35b562693e77e7d3d0"
receipt_review_reference: "CM-2085-ER-20260711-LOCAL-TAG-RECEIPT-PASS-BAF7ECCE"
force_allowed: false
push_all_tags_allowed: false
authorization_use_count: 1
```

## 当前效力

本文件只是申请书。明确授权前不得执行任何远端查询或 push；当前 tag 仅存在
于本地。
