# CM1113 Post Tombstone Sanitized Verification Approval Packet

Status: `CM1113_POST_TOMBSTONE_SANITIZED_VERIFICATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1113 drafts a separate exact approval packet for possible post-tombstone sanitized verification after CM-1111.

This packet is only meaningful if a future CM-1111 execution first returns `APPLIED_TOMBSTONED_SANITIZED` under the CM-1112 interpretation matrix.

CM-1113 does not approve CM-1111, execute CM-1111, execute this packet, call `search_memory`, call `memory_overview`, run `tombstone-memory`, read stores, read audit logs, or verify post-apply behavior.

## Source Dependency

This draft depends on a future result that does not currently exist:

```text
source_packet=CM-1111-PROOF-MEMORY-RETENTION-APPLY-APPROVAL-001
required_source_result_class=APPLIED_TOMBSTONED_SANITIZED
source_result_currently_available=false
```

If CM-1111 remains unapproved, unexecuted, rejected, failed, already-tombstoned without provenance, applied with audit warning, or otherwise classified as anything other than `APPLIED_TOMBSTONED_SANITIZED`, this CM-1113 packet is invalid and must not be used.

## Approval Packet

```text
packet_id=CM-1113-POST-TOMBSTONE-SANITIZED-VERIFY-APPROVAL-001
task_id=CM-1113
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
source_required_result_class=APPLIED_TOMBSTONED_SANITIZED
max_mcp_tool_calls=2
request_sha256=4693db72ffb82ff959b852f615eefde749a33332f99025624f0634febad4a1bd
status=DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY
```

Canonical request:

```json
{"packet_id":"CM-1113-POST-TOMBSTONE-SANITIZED-VERIFY-APPROVAL-001","task_id":"CM-1113","target_head":"16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d","target_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","source_required_result_class":"APPLIED_TOMBSTONED_SANITIZED","max_mcp_tool_calls":2,"allowed_calls":[{"tool":"search_memory","arguments":{"query":"codex-process-50325be15fdb479d805728fe420b4838","target":"process","limit":5,"include_content":false,"scope":{"client_id":"codex","strict":true}}},{"tool":"memory_overview","arguments":{"auditWindow":200,"limit":10}}],"forbidden":["record_memory","tombstone_memory_cli","raw_memory_output","raw_store_read","raw_audit_read","direct_jsonl_read","metadata_store_read","provider_api","durable_write","tombstone_apply","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Future Allowed Calls If Separately Exact-Approved

Exactly two public MCP calls at most:

1. `search_memory`

```json
{"query":"codex-process-50325be15fdb479d805728fe420b4838","target":"process","limit":5,"include_content":false,"scope":{"client_id":"codex","strict":true}}
```

2. `memory_overview`

```json
{"auditWindow":200,"limit":10}
```

The calls must return sanitized output only. The future operator must not print raw memory content, raw audit payload, diary content, `.jsonl` content, secret-looking values, provider credentials, or private raw corpus excerpts.

## Forbidden In This Packet

This packet forbids:

- `record_memory`
- `tombstone-memory` CLI
- raw memory output
- raw store read
- raw audit read
- direct `.jsonl` read
- metadata store read
- provider/API/model call
- durable memory/audit write
- tombstone apply
- cleanup apply
- rollback apply
- migration/import/export/backup/restore apply
- worker start
- public MCP expansion
- config/watchdog/startup/package/lockfile change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Interpretation Boundary

This public-tool-only packet is intentionally weaker than a metadata-only exact-id lifecycle read.

Possible future outcomes:

- A sanitized `search_memory` zero-result observation may be compatible with tombstone suppression, but does not prove durable lifecycle status.
- A sanitized `search_memory` positive-result observation may indicate post-apply suppression is not proven, unless the result is clearly unrelated metadata-only output with no raw content.
- A sanitized `memory_overview` observation may provide broad projection hints, but does not prove exact lifecycle status unless the public surface explicitly reports it.
- An inconclusive public-tool observation is not a failure of CM-1113; it means the public surface is insufficient and a separate stronger metadata-only packet may be needed.

CM-1113 can never prove:

- exact durable lifecycle status by itself
- raw store state
- audit-log correlation
- cleanup safety
- rollback safety
- long-run durability
- automatic retention worker safety
- startup/watchdog enforcement
- `memory write reliable`
- `memory recall reliable`
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness

## Draft Approval Line

The following line is a draft template only. It is not approved unless the user sends it later as a separate exact approval after CM-1111 returns `APPLIED_TOMBSTONED_SANITIZED`:

```text
I approve CM1113_EXACT_APPROVED_POST_TOMBSTONE_SANITIZED_PUBLIC_VERIFY_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d, only after CM-1111 has returned APPLIED_TOMBSTONED_SANITIZED for memory id codex-process-50325be15fdb479d805728fe420b4838, limited to exactly one search_memory call with include_content=false and exactly one memory_overview call matching request_sha256 4693db72ffb82ff959b852f615eefde749a33332f99025624f0634febad4a1bd, sanitized output only, no raw memory output, no raw store/audit/diary/.jsonl read, no metadata store read, no provider/model/API call, no durable memory/audit write, no record_memory, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Boundary

CM-1113 performed:

- local approval packet drafting
- request hash calculation
- docs/status/board update

CM-1113 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1113 approval
- CM-1113 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- raw memory, raw store, raw audit, diary, or `.jsonl` read
- metadata store read
- durable memory/audit write
- tombstone apply
- cleanup apply
- rollback apply
- migration/import/export/backup/restore apply
- provider/API/model call
- worker start
- public MCP expansion
- config/watchdog/startup/package/lockfile change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Decision

`CM1113_POST_TOMBSTONE_SANITIZED_VERIFICATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1113 is a draft-only public-tool sanitized verification packet. It is not executable without a later separate exact approval and a prior valid CM-1111 `APPLIED_TOMBSTONED_SANITIZED` result.
