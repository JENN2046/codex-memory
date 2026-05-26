# CM1115 Post Tombstone Metadata Lifecycle Verify Approval Packet

Status: `CM1115_POST_TOMBSTONE_METADATA_LIFECYCLE_VERIFY_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1115 drafts a separate exact approval packet for possible metadata-only exact-id lifecycle verification after a future CM-1111 tombstone apply and future CM-1113 public-tool observation.

This packet is only meaningful if both prior conditions are true:

1. CM-1111 returned `APPLIED_TOMBSTONED_SANITIZED` for the exact memory id.
2. CM-1113 returned `PUBLIC_SEARCH_ZERO_OVERVIEW_HINT_ONLY` or `PUBLIC_TOOLS_BOTH_OBSERVED_INCONCLUSIVE` under the CM-1114 interpretation matrix.

CM-1115 does not approve CM-1111, execute CM-1111, approve CM-1113, execute CM-1113, approve this packet, execute this packet, read stores, read audit logs, call MCP tools, or verify lifecycle behavior.

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

This source review is not a store read. It only identifies the narrowest future verification surface available in current source.

## Approval Packet

```text
packet_id=CM-1115-POST-TOMBSTONE-METADATA-LIFECYCLE-VERIFY-APPROVAL-001
task_id=CM-1115
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
required_prior_result_1=CM-1111:APPLIED_TOMBSTONED_SANITIZED
required_prior_result_2=CM-1113:PUBLIC_SEARCH_ZERO_OVERVIEW_HINT_ONLY_OR_PUBLIC_TOOLS_BOTH_OBSERVED_INCONCLUSIVE
max_metadata_store_reads=1
request_sha256=68863c9c71c40a48852bea1bd9de93017e40684fdaa57f4a501eb9a5f3ac68d4
status=DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY
```

Canonical request:

```json
{"packet_id":"CM-1115-POST-TOMBSTONE-METADATA-LIFECYCLE-VERIFY-APPROVAL-001","task_id":"CM-1115","target_head":"16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d","target_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","required_prior_results":[{"task_id":"CM-1111","result_class":"APPLIED_TOMBSTONED_SANITIZED"},{"task_id":"CM-1113","result_class_any_of":["PUBLIC_SEARCH_ZERO_OVERVIEW_HINT_ONLY","PUBLIC_TOOLS_BOTH_OBSERVED_INCONCLUSIVE"]}],"max_metadata_store_reads":1,"allowed_metadata_read":{"surface":"SqliteShadowStore.getRecordValidationPolicy","memory_id":"codex-process-50325be15fdb479d805728fe420b4838","selected_fields":["exists","lifecycleColumnAvailable","tombstoneReasonColumnAvailable","status","clientId","visibility"],"expected_status":"tombstoned","expected_client_id":"codex","expected_visibility":"internal_proof"},"forbidden":["record_memory","search_memory","memory_overview","tombstone_memory_cli","raw_memory_output","raw_store_read","raw_audit_read","direct_jsonl_read","content_evidence_raw_text_read","provider_api","durable_write","tombstone_apply","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Future Allowed Action If Separately Exact-Approved

Exactly one metadata-only exact-id lifecycle read:

```text
surface=SqliteShadowStore.getRecordValidationPolicy
memory_id=codex-process-50325be15fdb479d805728fe420b4838
selected_fields=exists,lifecycleColumnAvailable,tombstoneReasonColumnAvailable,status,clientId,visibility
expected_status=tombstoned
expected_client_id=codex
expected_visibility=internal_proof
max_reads=1
```

The future output must be sanitized and must not include raw memory content, title, evidence, raw text, diary content, chunk text, vector data, raw audit payload, `.jsonl` content, secret-looking values, provider credentials, database URL, or broad corpus summary.

## Forbidden In This Packet

This packet forbids:

- `record_memory`
- `search_memory`
- `memory_overview`
- `tombstone-memory` CLI
- raw memory output
- raw store read beyond the selected metadata fields
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

If this packet is later approved and the exact metadata read returns:

```text
exists=true
lifecycleColumnAvailable=true
tombstoneReasonColumnAvailable=true
status=tombstoned
clientId=codex
visibility=internal_proof
```

the maximum downgrade is:

```text
one exact-approved metadata-only exact-id lifecycle observation reports the CM-1100 proof memory as tombstoned with expected client/visibility metadata
```

It would still not prove:

- raw store absence
- chunk/vector/cache absence
- audit intent/commit correlation
- causal relation to CM-1111 apply beyond metadata consistency
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

If the metadata read is missing, mismatched, unavailable, malformed, or exposes forbidden output, the result must be interpreted by a separate future result matrix before any blocker downgrade.

## Draft Approval Line

The following line is a draft template only. It is not approved unless the user sends it later as a separate exact approval after the required CM-1111 and CM-1113 result classes exist:

```text
I approve CM1115_EXACT_APPROVED_POST_TOMBSTONE_METADATA_LIFECYCLE_VERIFY_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d, only after CM-1111 has returned APPLIED_TOMBSTONED_SANITIZED and CM-1113 has returned PUBLIC_SEARCH_ZERO_OVERVIEW_HINT_ONLY or PUBLIC_TOOLS_BOTH_OBSERVED_INCONCLUSIVE for memory id codex-process-50325be15fdb479d805728fe420b4838, limited to exactly one metadata-only exact-id SqliteShadowStore.getRecordValidationPolicy read matching request_sha256 68863c9c71c40a48852bea1bd9de93017e40684fdaa57f4a501eb9a5f3ac68d4, selected fields only exists/lifecycleColumnAvailable/tombstoneReasonColumnAvailable/status/clientId/visibility, sanitized output only, no raw memory output, no raw store/audit/diary/.jsonl read, no content/evidence/raw text read, no provider/model/API call, no durable memory/audit write, no record_memory/search_memory/memory_overview/tombstone-memory CLI, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Boundary

CM-1115 performed:

- local approval packet drafting
- current-source metadata surface review
- request hash calculation
- docs/status/board update

CM-1115 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1113 approval
- CM-1113 execution
- CM-1115 approval
- CM-1115 execution
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

`CM1115_POST_TOMBSTONE_METADATA_LIFECYCLE_VERIFY_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1115 is a draft-only metadata lifecycle verification packet. It is not executable without a later separate exact approval and the required prior CM-1111 and CM-1113 result classes.
