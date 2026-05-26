# CM1117 Post Tombstone Audit Correlation Approval Packet

Status: `CM1117_POST_TOMBSTONE_AUDIT_CORRELATION_APPROVAL_PACKET_DRAFT_BLOCKED_NO_SAFE_READER_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1117 drafts the boundary for a possible future post-tombstone audit-correlation observation after a future CM-1111 tombstone apply and a future CM-1115 metadata lifecycle observation.

This packet is fail-closed because current source does not expose a safe selected-field audit-correlation reader for true audit logs. It does not approve or execute CM-1111, CM-1115, this packet, `tombstone-memory`, any MCP tool, raw audit reads, direct `.jsonl` reads, store reads, or durable writes.

## Source Surface Review

Current source supports audit writing during internal tombstone apply:

```text
source_file=src/core/TombstoneMemoryService.js
write_surface=TombstoneMemoryService.appendMutationAudit(...)
event_family=memory_tombstone
pending_event_fields=event_id,memory_id,event_type,tool_name,actor_client_id,request_source,from_status,to_status,reason,evidence,tombstone_reason,audit_phase,mutation_applied
committed_event_fields=event_id,correlation_id,event_type,audit_phase,tool_name,memory_id,actor_client_id,request_source,from_status,to_status,tombstone_reason,mutation_applied
cancelled_event_fields=event_id,correlation_id,event_type,audit_phase,tool_name,memory_id,actor_client_id,request_source,from_status,to_status,tombstone_reason,mutation_applied,cancel_reason
```

Current temp-fixture tests verify the intended tombstone audit order and correlation:

```text
test_file=tests/tombstone-memory-runtime.test.js
covered_fixture_behavior=pending audit before mutation; committed audit after mutation; cancelled audit on guard failure; pending remains if committed append fails after mutation
```

Current read surface is not safe enough for the future true-audit observation this packet would need:

```text
source_file=src/storage/AuditLogStore.js
method=AuditLogStore.readRecentWriteAudit(maxLines,maxBytes)
current_behavior=reads recent JSONL entries and returns parsed full entries
selected_field_reader_available=false
raw_audit_risk=true
```

Therefore CM-1117 records:

```text
current_source_surface=NO_SAFE_SELECTED_AUDIT_CORRELATION_READER
current_packet_executable=false
```

No future execution may use `AuditLogStore.readRecentWriteAudit(...)` directly against true audit logs under this packet.

## Approval Packet

```text
packet_id=CM-1117-POST-TOMBSTONE-AUDIT-CORRELATION-APPROVAL-001
task_id=CM-1117
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
required_prior_result_1=CM-1111:APPLIED_TOMBSTONED_SANITIZED
required_prior_result_2=CM-1115:METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
current_source_surface=NO_SAFE_SELECTED_AUDIT_CORRELATION_READER
max_selected_audit_correlation_reads=1
request_sha256=e053d2dc0e4ede6b9d48b840fe60de461bf11cc47916a347a83fe573575430f0
status=DRAFT_BLOCKED_NO_SAFE_READER_NOT_EXECUTED_NOT_READY
```

Canonical request:

```json
{"packet_id":"CM-1117-POST-TOMBSTONE-AUDIT-CORRELATION-APPROVAL-001","task_id":"CM-1117","target_head":"16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d","target_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","required_prior_results":[{"task_id":"CM-1111","result_class":"APPLIED_TOMBSTONED_SANITIZED"},{"task_id":"CM-1115","result_class":"METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE"}],"current_source_surface":"NO_SAFE_SELECTED_AUDIT_CORRELATION_READER","allowed_future_action":{"surface":"to_be_implemented_sanitized_selected_audit_correlation_reader","max_selected_audit_correlation_reads":1,"filter":{"memory_id":"codex-process-50325be15fdb479d805728fe420b4838","event_type":"memory_tombstone","tool_name":"memory_tombstone","request_source":"CM-1111-proof-memory-retention-apply"},"selected_fields":["pending.event_id","pending.audit_phase","pending.mutation_applied","committed.event_id","committed.correlation_id","committed.audit_phase","committed.mutation_applied","memory_id","event_type","tool_name","actor_client_id","request_source","from_status","to_status","tombstone_reason"],"expected":{"pending.audit_phase":"pending","pending.mutation_applied":false,"committed.audit_phase":"committed","committed.mutation_applied":true,"committed.correlation_id":"pending.event_id","memory_id":"codex-process-50325be15fdb479d805728fe420b4838","from_status":"active","to_status":"tombstoned","actor_client_id":"codex","request_source":"CM-1111-proof-memory-retention-apply"}},"forbidden":["record_memory","search_memory","memory_overview","tombstone_memory_cli","raw_memory_output","raw_store_read","raw_audit_read","direct_jsonl_read","content_evidence_raw_text_read","provider_api","durable_write","tombstone_apply","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Future Allowed Action Only After A Safe Reader Exists

This packet cannot be executed against current source.

A future execution would require all of these to become true first:

- CM-1111 has returned `APPLIED_TOMBSTONED_SANITIZED`.
- CM-1115 has returned `METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE`.
- A current-source sanitized selected audit-correlation reader exists and has been reviewed.
- The future approval names that exact reader and this request hash.
- The future read is limited to exactly one selected-field correlation observation for the exact memory id.

Future selected fields must be limited to:

```text
pending.event_id
pending.audit_phase
pending.mutation_applied
committed.event_id
committed.correlation_id
committed.audit_phase
committed.mutation_applied
memory_id
event_type
tool_name
actor_client_id
request_source
from_status
to_status
tombstone_reason
```

The future output must be sanitized and must not include raw memory content, title, reason, evidence, diary content, chunk text, vector data, raw audit payload, direct `.jsonl` lines, secret-looking values, provider credentials, database URL, or broad corpus summary.

## Forbidden In This Packet

This packet forbids:

- `record_memory`
- `search_memory`
- `memory_overview`
- `tombstone-memory` CLI
- raw memory output
- raw store read
- raw audit read
- direct `.jsonl` read
- content/evidence/raw text read
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

If a future safe reader exists, this packet is separately approved, and the selected audit correlation returns:

```text
pending.audit_phase=pending
pending.mutation_applied=false
committed.audit_phase=committed
committed.mutation_applied=true
committed.correlation_id=pending.event_id
memory_id=codex-process-50325be15fdb479d805728fe420b4838
event_type=memory_tombstone
tool_name=memory_tombstone
actor_client_id=codex
request_source=CM-1111-proof-memory-retention-apply
from_status=active
to_status=tombstoned
```

the maximum downgrade would be:

```text
one exact-approved selected-field audit-correlation observation reports pending and committed memory_tombstone audit metadata for the exact CM-1100 proof memory
```

It would still not prove:

- raw audit payload safety beyond the selected reader output
- raw store absence
- chunk/vector/cache absence
- public/default recall suppression
- cleanup safety
- rollback safety
- long-run durability
- automatic retention worker safety
- startup/watchdog enforcement
- public/default write reliability
- public/default recall reliability
- `memory write reliable`
- `memory recall reliable`
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness

If no safe selected-field reader exists, if the approval permits raw audit reads, or if the selected output is missing/mismatched/malformed, the result must be fail-closed and no blocker downgrade is allowed.

## Draft Approval Line

The following line is a draft template only. It is not approved and is not executable against current source:

```text
I approve CM1117_EXACT_APPROVED_POST_TOMBSTONE_AUDIT_CORRELATION_VERIFY_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d, only after CM-1111 has returned APPLIED_TOMBSTONED_SANITIZED and CM-1115 has returned METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE for memory id codex-process-50325be15fdb479d805728fe420b4838, and only if current source contains a reviewed sanitized selected audit-correlation reader, limited to exactly one selected-field audit-correlation observation matching request_sha256 e053d2dc0e4ede6b9d48b840fe60de461bf11cc47916a347a83fe573575430f0, selected fields only pending.event_id/pending.audit_phase/pending.mutation_applied/committed.event_id/committed.correlation_id/committed.audit_phase/committed.mutation_applied/memory_id/event_type/tool_name/actor_client_id/request_source/from_status/to_status/tombstone_reason, sanitized output only, no raw memory output, no raw store/audit/diary/.jsonl read, no content/evidence/raw text read, no provider/model/API call, no durable memory/audit write, no record_memory/search_memory/memory_overview/tombstone-memory CLI, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Boundary

CM-1117 performed:

- local approval-packet boundary drafting
- current-source audit write/read surface review
- request hash calculation
- docs/status/board update

CM-1117 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1115 approval
- CM-1115 execution
- CM-1117 approval
- CM-1117 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- raw memory, raw store, raw audit, diary, or `.jsonl` read
- metadata store read
- audit log read
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

`CM1117_POST_TOMBSTONE_AUDIT_CORRELATION_APPROVAL_PACKET_DRAFT_BLOCKED_NO_SAFE_READER_NOT_EXECUTED_NOT_READY`

CM-1117 is a draft-only, fail-closed audit-correlation packet. It is not executable against current source because a safe selected-field audit-correlation reader is not available.
