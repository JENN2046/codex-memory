# codex-memory 本地 Tag 创建独立授权申请书（CM-2084）

申请日期：2026-07-11

## 申请事项

基于已通过的 Tag Approval Packet，现仅申请创建一个本地 annotated Git tag：

```yaml
tag_creation_authorized: false  # 本次申请改为 true
tag_push_authorized: false
release_creation_authorized: false
release_publication_authorized: false
deploy_authorized: false
cutover_authorized: false
```

## 精确动作绑定

```yaml
candidate_tag: "v0.2.0-readonly-context-rc"
tag_type: "annotated"
target_commit: "170ee33963cd0a41565625b41418d12702dd221b"
target_tree: "c3e12feb3ab338f4eabaa3964483d2d8b1f43b33"
tag_message: "codex-memory readonly-context RC candidate; not RC_READY; no release authorization"
packet_payload_sha256: "c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43"
tag_approval_decision_reference: "CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4"
```

授权后只允许执行一次等价于以下精确语义的本地动作：

```text
create annotated tag v0.2.0-readonly-context-rc
point exactly to 170ee33963cd0a41565625b41418d12702dd221b
use exactly the bound tag message
```

随后只允许进行本地只读验证：tag 存在、类型为 annotated、peeled commit
精确等于目标 commit、目标 tree 不变。验证失败时停止，不 push；删除或重建
tag 需要另行明确授权。

## 明确不申请

本申请不授权：

- tag push 或 `git push --tags`；
- branch push；
- GitHub Release、软件包发布；
- deploy、cutover；
- Phase 8 native write、rollback 或 compensation；
- 修改真实记忆；
- 默认 MCP 扩张或公开 `commit_memory_delta`；
- production/release readiness、`RC_READY`、complete V8 或完整计划包完成声明。

## 建议决定格式

```yaml
tag_creation_authorized: true
tag_push_authorized: false
release_creation_authorized: false
release_publication_authorized: false
deploy_authorized: false
cutover_authorized: false

decision_reference: "<独立本地 tag 创建授权编号>"
candidate_tag: "v0.2.0-readonly-context-rc"
tag_type: "annotated"
target_commit: "170ee33963cd0a41565625b41418d12702dd221b"
target_tree: "c3e12feb3ab338f4eabaa3964483d2d8b1f43b33"
packet_payload_sha256: "c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43"
tag_approval_decision_reference: "CM-2083-ER-20260711-TAG-PACKET-PASS-C06836B4"
```

## 当前效力

本文件只是授权申请。明确批准并完成创建前，本地 tag 仍不存在，所有 push、
release、deploy 和 readiness 权限仍为 false。
