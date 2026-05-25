# CM1099 Exact Record Memory Write Approval Packet

Status: `DRAFT_NOT_APPROVED_NOT_WRITTEN_NOT_READY`

Date: 2026-05-25

## Approval Packet

```text
APPROVAL_PACKET_ID: CM-1099-EXACT-RECORD-MEMORY-WRITE-001
target_tool: record_memory
max_calls: 1
current_head: d12279339cbb9e6a30d96d4a87075648e00a6569
sealed_v1_0_rc: f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9
payload_sha256: 77b70409f17f5e675eb1221f3d56c9da3df130c32c8d431a44bc57b6d4d49e72
token_path_required: true
token_path_precondition: current Codex Desktop MCP connector/tool session has been reloaded and will use bearer_token_env_var=CODEX_MEMORY_HTTP_TOKEN
allowed_side_effects: exactly one accepted record_memory write plus normal write-path audit only
forbidden: search_memory, provider/API calls, raw store reads, cleanup/rollback/tombstone apply, schema migration, config/watchdog/startup/dependency change, public MCP expansion, push/tag/release/deploy, readiness/reliability claim
post_write_verification: returned result-shape inspection only; no raw store read and no search_memory marker query
```

## Exact Payload

```json
{"target":"process","title":"checkpoint: V1.1 authorized write path boundary reached","content":"checkpoint: codex-memory V1.1 write-governance auth path reached. CM-1097 diagnosed CM-1096 no-token mutation rejection as active HTTP MCP no-token mutation gate. CM-1098 enabled local bearer-authorized MCP path through user-level Codex config bearer_token_env_var=CODEX_MEMORY_HTTP_TOKEN and Windows user environment token without printing token value. Local 7605 /health reports auth.required=true and direct bearer-authenticated HTTP MCP initialize/tools-list succeeded. No memory write has occurred after CM-1096; CM-1096 approval is consumed and must not be reused.","evidence":"Local evidence: commits 2253c64, 49b1a83, and d122793 recorded write-governance boundaries, token-path diagnostic, and auth-path enablement. CM-1098 did not call record_memory/search_memory and did not read raw store/audit. Sealed v1.0.0-rc.1 remains f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9.","tags":["v1.1","write-governance","auth-path","checkpoint","cm-1097","cm-1098"],"sensitivity":"none","validated":true,"reusable":false,"project_id":"codex-memory","workspace_id":"A:/codex-memory","client_id":"codex","task_id":"CM-1098","visibility":"project","retention_policy":"short_lived_or_tombstone_after_validation"}
```

## Required Approval Line

```text
我批准执行 CM-1099-EXACT-RECORD-MEMORY-WRITE-001：target_tool=record_memory，max_calls=1，current_head=d12279339cbb9e6a30d96d4a87075648e00a6569，payload_sha256=77b70409f17f5e675eb1221f3d56c9da3df130c32c8d431a44bc57b6d4d49e72，只允许写入 docs/CM1099_EXACT_RECORD_MEMORY_WRITE_APPROVAL_PACKET.md 中的 exact JSON payload，并只允许正常 write-path audit；前提是当前 Codex Desktop MCP connector/tool session 已重新加载并会使用 bearer_token_env_var=CODEX_MEMORY_HTTP_TOKEN；禁止 search_memory、provider/API calls、raw store reads、apply、schema/config/watchdog/startup/dependency change、public MCP expansion、push/tag/release/deploy、readiness/reliability claim。
```

## Stop Conditions

Stop without calling `record_memory` if:

- current head no longer equals `d12279339cbb9e6a30d96d4a87075648e00a6569`
- payload hash no longer equals `77b70409f17f5e675eb1221f3d56c9da3df130c32c8d431a44bc57b6d4d49e72`
- the Codex Desktop MCP connector/tool session has not been reloaded after CM-1098, or cannot be confirmed to use `bearer_token_env_var=CODEX_MEMORY_HTTP_TOKEN`
- execution would require printing token values
- execution would require editing config/watchdog/startup/dependencies
- execution would require `search_memory` or raw store/audit reads
- the single approved call returns `NO_TOKEN_MUTATION_REJECTED`, `Unauthorized`, or any other non-accepted result

CM-1096 was approved once, consumed once, and rejected before write acceptance. It must not be reused. CM-1099 is a fresh draft packet only; it is not approval and it does not execute a write.
