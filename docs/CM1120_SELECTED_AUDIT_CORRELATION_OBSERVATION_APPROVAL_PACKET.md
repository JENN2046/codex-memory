# CM1120 Selected Audit Correlation Observation Approval Packet

Status: `CM1120_SELECTED_AUDIT_CORRELATION_OBSERVATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1120 drafts the exact approval boundary for a possible future selected audit-correlation observation using the CM-1118 selected-field helper and the CM-1119 interpretation matrix.

This packet exists because CM-1117 was intentionally fail-closed when no safe selected-field audit-correlation reader existed. CM-1118 added the reader with temp-fixture coverage, and CM-1119 defined how future results must be interpreted. CM-1120 still does not approve or execute any true audit observation.

## Current Preconditions

Current local artifacts:

```text
source_helper=AuditLogStore.readSelectedWriteAuditCorrelation(...)
source_helper_evidence=CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY
interpretation_matrix=CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
```

Required future prior results before this packet could be executed:

```text
CM-1111:APPLIED_TOMBSTONED_SANITIZED
CM-1115:METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
```

Those prior results are not established by this packet.

## Approval Packet

```text
packet_id=CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001
task_id=CM-1120
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
required_prior_result_1=CM-1111:APPLIED_TOMBSTONED_SANITIZED
required_prior_result_2=CM-1115:METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
required_current_artifact_1=CM-1118:AuditLogStore.readSelectedWriteAuditCorrelation
required_current_artifact_2=CM-1119:selected audit-correlation interpretation matrix
max_selected_audit_correlation_reads=1
request_sha256=dfe4edcece5d561bbcdcdf38764679f6822cad77939dea06d68788a9840bad8e
status=DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY
```

Canonical request:

```json
{"packet_id":"CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001","task_id":"CM-1120","target_head":"16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d","target_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","required_prior_results":[{"task_id":"CM-1111","result_class":"APPLIED_TOMBSTONED_SANITIZED"},{"task_id":"CM-1115","result_class":"METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE"}],"required_current_artifacts":[{"task_id":"CM-1118","result_class":"CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY","helper":"AuditLogStore.readSelectedWriteAuditCorrelation"},{"task_id":"CM-1119","result_class":"CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY"}],"allowed_future_action":{"surface":"AuditLogStore.readSelectedWriteAuditCorrelation","max_selected_audit_correlation_reads":1,"max_lines":"default_or_less","max_bytes":"default_or_less","filter":{"memory_id":"codex-process-50325be15fdb479d805728fe420b4838","event_type":"memory_tombstone","tool_name":"memory_tombstone","request_source":"CM-1111-proof-memory-retention-apply"},"selected_fields":["found","reason","selectedFieldsOnly","rawAuditReturned","inspectedEntryCount","matchedEventCount","memoryId","eventType","toolName","requestSource","pending.eventId","pending.correlationId","pending.auditPhase","pending.mutationApplied","pending.memoryId","pending.eventType","pending.toolName","pending.actorClientId","pending.requestSource","pending.fromStatus","pending.toStatus","pending.tombstoneReason","committed.eventId","committed.correlationId","committed.auditPhase","committed.mutationApplied","committed.memoryId","committed.eventType","committed.toolName","committed.actorClientId","committed.requestSource","committed.fromStatus","committed.toStatus","committed.tombstoneReason"],"expected_if_found":{"selectedFieldsOnly":true,"rawAuditReturned":false,"pending.auditPhase":"pending","pending.mutationApplied":false,"committed.auditPhase":"committed","committed.mutationApplied":true,"committed.correlationId":"pending.eventId","memoryId":"codex-process-50325be15fdb479d805728fe420b4838","eventType":"memory_tombstone","toolName":"memory_tombstone","requestSource":"CM-1111-proof-memory-retention-apply","pending.fromStatus":"active","pending.toStatus":"tombstoned","committed.fromStatus":"active","committed.toStatus":"tombstoned"},"interpretation_matrix":"CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX"},"forbidden":["record_memory","search_memory","memory_overview","tombstone_memory_cli","raw_memory_output","raw_store_read","raw_audit_output","direct_jsonl_read","content_evidence_raw_text_read","provider_api","durable_memory_or_audit_write","tombstone_apply","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Allowed Future Action If Separately Approved

Only if a future operator provides the exact approval line and the required prior results are present, execution would be limited to:

```text
surface=AuditLogStore.readSelectedWriteAuditCorrelation(...)
max_selected_audit_correlation_reads=1
memoryId=codex-process-50325be15fdb479d805728fe420b4838
eventType=memory_tombstone
toolName=memory_tombstone
requestSource=CM-1111-proof-memory-retention-apply
maxLines=default_or_less
maxBytes=default_or_less
```

The output must be selected and sanitized:

```text
found
reason
selectedFieldsOnly
rawAuditReturned
inspectedEntryCount
matchedEventCount
memoryId
eventType
toolName
requestSource
pending.eventId
pending.correlationId
pending.auditPhase
pending.mutationApplied
pending.memoryId
pending.eventType
pending.toolName
pending.actorClientId
pending.requestSource
pending.fromStatus
pending.toStatus
pending.tombstoneReason
committed.eventId
committed.correlationId
committed.auditPhase
committed.mutationApplied
committed.memoryId
committed.eventType
committed.toolName
committed.actorClientId
committed.requestSource
committed.fromStatus
committed.toStatus
committed.tombstoneReason
```

The result must be interpreted through `docs/CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX.md`.

## Forbidden

This packet forbids:

- `record_memory`
- `search_memory`
- `memory_overview`
- `tombstone-memory` CLI
- raw memory output
- raw store read
- raw audit output
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

## Draft Approval Line

The following line is a draft template only. It is not approved:

```text
I approve CM1120_EXACT_APPROVED_SELECTED_AUDIT_CORRELATION_OBSERVATION_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d, only after CM-1111 has returned APPLIED_TOMBSTONED_SANITIZED and CM-1115 has returned METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE for memory id codex-process-50325be15fdb479d805728fe420b4838, using only AuditLogStore.readSelectedWriteAuditCorrelation through the current CM-1118 selected-field helper, interpreted only by the CM-1119 matrix, limited to exactly one selected audit-correlation observation matching request_sha256 dfe4edcece5d561bbcdcdf38764679f6822cad77939dea06d68788a9840bad8e, with memoryId=codex-process-50325be15fdb479d805728fe420b4838, eventType=memory_tombstone, toolName=memory_tombstone, requestSource=CM-1111-proof-memory-retention-apply, default-or-less maxLines/maxBytes, selected sanitized output only, no raw memory output, no raw store/audit/diary/.jsonl output, no content/evidence/raw text read, no provider/model/API call, no durable memory/audit write, no record_memory/search_memory/memory_overview/tombstone-memory CLI, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Maximum Possible Downgrade

If a future exact-approved execution returns `AUDIT_SELECTED_CORRELATION_OBSERVED` under the CM-1119 matrix, the maximum downgrade is:

```text
from: no exact-approved selected audit-correlation observation exists
to: one exact-approved selected-field audit-correlation observation reports pending and committed memory_tombstone audit metadata for the exact CM-1100 proof memory and expected CM-1111 request source
```

It still does not prove:

- raw audit payload safety beyond selected output
- raw store absence
- chunk/vector/cache absence
- current metadata lifecycle projection unless separately established
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

## Boundary

CM-1120 performed:

- local approval-packet drafting
- request hash calculation
- docs/status/board update

CM-1120 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1115 approval
- CM-1115 execution
- CM-1120 approval
- CM-1120 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- true audit log read
- raw audit read
- direct `.jsonl` read
- raw memory, raw store, diary, or metadata store read
- durable project memory/audit write
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

`CM1120_SELECTED_AUDIT_CORRELATION_OBSERVATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
