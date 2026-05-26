# CM1172 Temp-Local Reconcile Positive Dry-Run Approval Packet

Status: `CM1172_TEMP_LOCAL_RECONCILE_POSITIVE_DRY_RUN_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`
Packet id: `CM-1172-TEMP-LOCAL-RECONCILE-POSITIVE-DRY-RUN-APPROVAL-001`
Controlling state: `NOT_READY_BLOCKED`

## Purpose

CM-1172 prepares a draft exact approval request after CM-1171 consumed and recorded the CM-1170 temp-local dry-run.

CM-1171 proved that one isolated `MemoryWriteReconcileWorker.runOnce({ dryRun:true, limit:1 })` can complete against an empty temp-local queue. It did not prove the positive queued-task dry-run path.

This packet is draft-only. It is not approval and it does not execute a dry-run.

## Current Basis

Current clean repository facts before this packet:

```text
branch=main
head=8cbe58c13c1057114b8fc0f1cf986ded9ba72261
worktree=clean
latest_completed_execution_record=CM-1171
cm1171_result_class=CM1171_CM1170_TEMP_LOCAL_DRY_RUN_EXECUTED_RECORDED_NOT_READY
```

Source inspection shows the bounded queue surface is `SqliteShadowStore.enqueueReconcileTask(task)`, and the dry-run consumer is `MemoryWriteReconcileWorker.runOnce({ dryRun:true, limit:1 })` through `MemoryWriteReconcileService.replayPending(...)`.

The worker dry-run path returns `would_replay` before projection replay. Therefore a temp-local positive dry-run can be bounded to one synthetic queued reconcile task without calling `record_memory`, writing diary records, writing projections, clearing queue tasks, or touching real stores.

## Approval Scope

The future exact-approved CM-1172 action is limited to one temp-local positive dry-run execution request:

```text
surface=SqliteShadowStore.enqueueReconcileTask + MemoryWriteReconcileWorker.runOnce
store_scope=temp_local_or_fixture_only
synthetic_reconcile_task_count=1
synthetic_store_kind=vector
dryRun=true
apply=false
confirm=false
maxRuns=1
workerLimit=1
isolatedTempRoot=true
cleanupRequired=true
rawOutputAllowed=false
durableAuditAllowed=false
max_runtime_probe_minutes=10
```

The future action may seed exactly one synthetic temp-local reconcile task with a non-secret, non-real `memoryId` and a minimal non-empty payload. It may then run the worker once in dry-run mode and record only selected counters.

Expected output class if separately exact-approved and successful:

```text
TEMP_LOCAL_POSITIVE_RECONCILE_DRY_RUN_EXECUTED_NOT_READY
```

Expected selected counters:

```text
scannedTaskCount=1
wouldReplayCount=1
replayedCount=0
clearedCount=0
failedCount=0
skippedCount=0
```

This output class would still not prove startup recovery, runtime recovery, real-store repair, durable audit write, write reliability, recall reliability, runtime readiness, RC readiness, production readiness, or release readiness.

## Canonical Request Shape

The final copy/paste approval line must be generated after this packet is committed, because local commit changes `HEAD`.

The final request hash is computed from this canonical shape with the final clean `target_head` filled in:

```json
{"packet_id":"CM-1172-TEMP-LOCAL-RECONCILE-POSITIVE-DRY-RUN-APPROVAL-001","task_id":"CM-1172","target_head":"<FINAL_CLEAN_HEAD_AFTER_PACKET_COMMIT>","required_prior_results":[{"task_id":"CM-1171","result_class":"CM1171_CM1170_TEMP_LOCAL_DRY_RUN_EXECUTED_RECORDED_NOT_READY"}],"allowed_future_action":{"surface":"SqliteShadowStore.enqueueReconcileTask + MemoryWriteReconcileWorker.runOnce","store_scope":"temp_local_or_fixture_only","synthetic_reconcile_task_count":1,"synthetic_store_kind":"vector","dryRun":true,"apply":false,"confirm":false,"maxRuns":1,"workerLimit":1,"isolatedTempRoot":true,"cleanupRequired":true,"rawOutputAllowed":false,"durableAuditAllowed":false,"max_runtime_probe_minutes":10,"expected_result_class":"TEMP_LOCAL_POSITIVE_RECONCILE_DRY_RUN_EXECUTED_NOT_READY","expected_counters":{"scannedTaskCount":1,"wouldReplayCount":1,"replayedCount":0,"clearedCount":0,"failedCount":0,"skippedCount":0}},"forbidden":["real_memory_store","production_store","record_memory_call","diary_write","projection_apply","startup_recovery_execute","runtime_recovery_execute","manifest_recovery_execute","manifest_repair_execute","manifest_cancel_execute","reconcile_replay_apply","durable_audit_write","raw_output","provider_api","public_mcp_expansion","config_watchdog_startup_package_change","dependency_change","migration_import_export_backup_restore_apply","cleanup_apply","rollback_apply","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

## Forbidden In This Packet

This packet forbids:

- CM-1172 execution now
- CM-1170 approval reuse
- real memory store access
- production store access
- `record_memory` call
- diary write
- projection apply
- startup recovery execution
- runtime recovery execution
- manifest recovery, repair, or cancellation execution
- reconcile replay apply
- durable audit write
- raw output
- provider/API/model call
- public MCP expansion
- config/watchdog/startup/package/lockfile change
- dependency change
- migration/import/export/backup/restore apply
- cleanup apply outside the isolated temp root
- rollback apply
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Decision

`CM1172_TEMP_LOCAL_RECONCILE_POSITIVE_DRY_RUN_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1172 prepares the exact approval request only. It does not approve or execute the positive dry-run.
