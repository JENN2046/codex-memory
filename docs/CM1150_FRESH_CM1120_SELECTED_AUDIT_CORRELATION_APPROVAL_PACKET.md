# CM1150 Fresh CM1120 Selected Audit Correlation Approval Packet

Status: `CM1150_FRESH_CM1120_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`
Packet id: `CM-1150-FRESH-CM1120-SELECTED-AUDIT-CORRELATION-APPROVAL-001`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1150 prepares a fresh CM-1120 exact approval request boundary after CM-1149 current-facts gates recognized both recorded prior results and selected CM-1120 target-head rebaseline as the next allowed action.

This packet is draft-only. It is not approval and it does not execute CM-1120.

## Current Gate Basis

Latest clean-head current-facts gates reported:

```text
dirtyStatusLineCount=0
recordedPriorResultTaskIds=CM-1111,CM-1115
requiredPriorResultsBound=true
blockerReasons=localHead_target_head_mismatch,originHead_target_head_mismatch,remoteMainHead_target_head_mismatch
stageClass=WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115
resolutionClass=WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115
nextAllowedAction=prepare_fresh_cm1120_target_head_rebaseline_packet_only
nextApprovalTarget=CM-1120-rebaseline
cm1120ApprovalRequestAllowed=false
cm1120ExecutionAuthorizedNow=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

## Approval Scope

The future exact-approved CM-1120 action is limited to one selected audit-correlation observation:

```text
surface=AuditLogStore.readSelectedWriteAuditCorrelation
memory_id=codex-process-50325be15fdb479d805728fe420b4838
event_type=memory_tombstone
tool_name=memory_tombstone
request_source=CM-1111-proof-memory-retention-apply
max_selected_audit_correlation_reads=1
max_lines=default_or_less
max_bytes=default_or_less
```

Required prior results:

```text
CM-1111:APPLIED_TOMBSTONED_SANITIZED
CM-1115:METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
```

Required current artifacts:

```text
CM-1118:CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY
CM-1119:CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY
```

## Canonical Request Shape

The final copy/paste approval line must be generated after this packet is committed, because local commit changes `HEAD`.

The final request hash is computed from this canonical shape with the final clean `target_head` filled in:

```json
{"packet_id":"CM-1150-FRESH-CM1120-SELECTED-AUDIT-CORRELATION-APPROVAL-001","task_id":"CM-1120","target_head":"<FINAL_CLEAN_HEAD_AFTER_PACKET_COMMIT>","target_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","required_prior_results":[{"task_id":"CM-1111","result_class":"APPLIED_TOMBSTONED_SANITIZED"},{"task_id":"CM-1115","result_class":"METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE"}],"required_current_artifacts":[{"task_id":"CM-1118","result_class":"CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY","helper":"AuditLogStore.readSelectedWriteAuditCorrelation"},{"task_id":"CM-1119","result_class":"CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY"}],"allowed_future_action":{"surface":"AuditLogStore.readSelectedWriteAuditCorrelation","max_selected_audit_correlation_reads":1,"max_lines":"default_or_less","max_bytes":"default_or_less","filter":{"memory_id":"codex-process-50325be15fdb479d805728fe420b4838","event_type":"memory_tombstone","tool_name":"memory_tombstone","request_source":"CM-1111-proof-memory-retention-apply"},"selected_fields":["found","reason","selectedFieldsOnly","rawAuditReturned","inspectedEntryCount","matchedEventCount","memoryId","eventType","toolName","requestSource","pending.eventId","pending.correlationId","pending.auditPhase","pending.mutationApplied","pending.memoryId","pending.eventType","pending.toolName","pending.actorClientId","pending.requestSource","pending.fromStatus","pending.toStatus","pending.tombstoneReason","committed.eventId","committed.correlationId","committed.auditPhase","committed.mutationApplied","committed.memoryId","committed.eventType","committed.toolName","committed.actorClientId","committed.requestSource","committed.fromStatus","committed.toStatus","committed.tombstoneReason"],"expected_if_found":{"selectedFieldsOnly":true,"rawAuditReturned":false,"pending.auditPhase":"pending","pending.mutationApplied":false,"committed.auditPhase":"committed","committed.mutationApplied":true,"committed.correlationId":"pending.eventId","memoryId":"codex-process-50325be15fdb479d805728fe420b4838","eventType":"memory_tombstone","toolName":"memory_tombstone","requestSource":"CM-1111-proof-memory-retention-apply","pending.fromStatus":"active","pending.toStatus":"tombstoned","committed.fromStatus":"active","committed.toStatus":"tombstoned"},"interpretation_matrix":"CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX"},"forbidden":["record_memory","search_memory","memory_overview","tombstone_memory_cli","raw_memory_output","raw_store_read","raw_audit_output","direct_jsonl_read","content_evidence_raw_text_read","provider_api","durable_memory_or_audit_write","tombstone_apply","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","dependency_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Forbidden In This Packet

This packet forbids:

- CM-1120 execution now
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
- dependency change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Interpretation Boundary

If CM-1120 is later separately exact-approved and returns a favorable selected audit result, the maximum result class is:

```text
AUDIT_SELECTED_CORRELATION_OBSERVED
```

That result would still not prove raw store absence, chunk/vector/cache absence, public/default recall suppression, cleanup safety, rollback safety, long-run durability, automatic retention worker safety, startup/watchdog enforcement, `memory write reliable`, `memory recall reliable`, runtime readiness, RC readiness, production readiness, or release/cutover readiness.

## Decision

`CM1150_FRESH_CM1120_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1150 prepares the CM-1120 exact approval request only. It does not approve or execute CM-1120.
