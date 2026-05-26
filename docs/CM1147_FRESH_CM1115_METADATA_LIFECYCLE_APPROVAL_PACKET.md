# CM1147 Fresh CM1115 Metadata Lifecycle Approval Packet

Status: `CM1147_FRESH_CM1115_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`
Packet id: `CM-1147-FRESH-CM1115-METADATA-LIFECYCLE-APPROVAL-001`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1147 prepares the next ordered approval request after CM-1146 current-facts gates recognized the CM-1145 recorded CM-1111 result.

This packet is draft-only. It is not approval and it does not execute CM-1115.

## Current Gate Basis

Latest clean-head current-facts gates reported:

```text
dirtyStatusLineCount=0
recordedPriorResultTaskIds=CM-1111
prior_result_CM-1111_missing=false
prior_result_CM-1115_missing=true
stageClass=WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111
nextApprovalTarget=CM-1115
cm1115ExecutionAuthorizedNow=false
cm1120ExecutionAuthorizedNow=false
```

CM-1120 remains blocked until a CM-1115 result exists and later CM-1120 rebaseline/approval gates allow it.

## Source Surface Review

Current source provides a narrow metadata-only exact-id surface:

```text
source_file=src/storage/SqliteShadowStore.js
method=SqliteShadowStore.getRecordValidationPolicy(memoryId)
selected_columns=memory_id,client_id,visibility,status_if_column_exists
returned_fields=exists,lifecycleColumnAvailable,tombstoneReasonColumnAvailable,status,clientId,visibility
raw_content_returned=false
evidence_returned=false
raw_text_returned=false
diary_returned=false
audit_returned=false
```

This source review is not a store read.

## Approval Scope

The future exact-approved CM-1115 action is limited to one metadata-only exact-id read:

```text
surface=SqliteShadowStore.getRecordValidationPolicy
memory_id=codex-process-50325be15fdb479d805728fe420b4838
selected_fields=exists,lifecycleColumnAvailable,tombstoneReasonColumnAvailable,status,clientId,visibility
expected_status=tombstoned
expected_client_id=codex
expected_visibility=internal_proof
max_reads=1
```

Required prior result:

```text
CM-1111:APPLIED_TOMBSTONED_SANITIZED
```

Required interpretation matrix:

```text
CM-1116:CM1116_POST_TOMBSTONE_METADATA_LIFECYCLE_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY
```

## Canonical Request Shape

The final copy/paste approval line must be generated after this packet is committed, because local commit changes `HEAD`.

The final request hash is computed from this canonical shape with the final clean `target_head` filled in:

```json
{"packet_id":"CM-1147-FRESH-CM1115-METADATA-LIFECYCLE-APPROVAL-001","task_id":"CM-1115","target_head":"<FINAL_CLEAN_HEAD_AFTER_PACKET_COMMIT>","target_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","required_prior_results":[{"task_id":"CM-1111","result_class":"APPLIED_TOMBSTONED_SANITIZED"}],"required_interpretation_matrix":{"task_id":"CM-1116","result_class":"CM1116_POST_TOMBSTONE_METADATA_LIFECYCLE_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY"},"max_metadata_store_reads":1,"allowed_metadata_read":{"surface":"SqliteShadowStore.getRecordValidationPolicy","memory_id":"codex-process-50325be15fdb479d805728fe420b4838","selected_fields":["exists","lifecycleColumnAvailable","tombstoneReasonColumnAvailable","status","clientId","visibility"],"expected_status":"tombstoned","expected_client_id":"codex","expected_visibility":"internal_proof"},"forbidden":["record_memory","search_memory","memory_overview","tombstone_memory_cli","raw_memory_output","raw_store_read_beyond_selected_metadata_fields","raw_audit_read","direct_jsonl_read","content_evidence_raw_text_read","provider_api","durable_write","tombstone_apply","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","dependency_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Forbidden In This Packet

This packet forbids:

- CM-1115 execution now
- CM-1120 approval or execution
- `record_memory`
- `search_memory`
- `memory_overview`
- `tombstone-memory` CLI
- raw memory output
- raw store read beyond selected metadata fields
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
- dependency change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Interpretation Boundary

If CM-1115 is later separately exact-approved and the metadata read returns:

```text
exists=true
lifecycleColumnAvailable=true
tombstoneReasonColumnAvailable=true
status=tombstoned
clientId=codex
visibility=internal_proof
```

the maximum result class is:

```text
METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE
```

That result would still not prove raw store absence, chunk/vector/cache absence, audit intent/commit correlation, public/default recall suppression, cleanup safety, rollback safety, long-run durability, automatic retention worker safety, startup/watchdog enforcement, `memory write reliable`, `memory recall reliable`, runtime readiness, RC readiness, production readiness, or release/cutover readiness.

## Decision

`CM1147_FRESH_CM1115_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1147 prepares the CM-1115 exact approval request only. It does not approve or execute CM-1115.
