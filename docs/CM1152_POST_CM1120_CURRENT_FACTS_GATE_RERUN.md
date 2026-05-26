# CM1152 Post-CM1120 Current-Facts Gate Rerun

Status: `CM1152_POST_CM1120_CURRENT_FACTS_GATE_RERUN_REPAIRED_PROOF_ALLOWED_NOT_READY`
Date: 2026-05-26

## Purpose

CM-1152 lets the current-facts gate chain ingest the already-recorded CM-1120 execution result from CM-1151.

Before this repair, the gates still treated CM-1120 as a stale target-head approval packet and returned `WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115`, even though CM-1120 had already executed and was recorded as `AUDIT_SELECTED_CORRELATION_OBSERVED`.

## Change

The current-facts classifier now reads only the sanitized CM-1151 execution record surface:

```text
docs/CM1151_CM1120_SELECTED_AUDIT_CORRELATION_EXECUTION_RECORD.md
```

It accepts that surface only when the expected selected fields are present:

```text
resultClass=AUDIT_SELECTED_CORRELATION_OBSERVED
selectedFieldsOnly=true
rawAuditReturned=false
memoryId=codex-process-50325be15fdb479d805728fe420b4838
eventType=memory_tombstone
toolName=memory_tombstone
requestSource=CM-1111-proof-memory-retention-apply
pending.auditPhase=pending
pending.mutationApplied=false
committed.auditPhase=committed
committed.mutationApplied=true
pending.fromStatus=active
pending.toStatus=tombstoned
committed.fromStatus=active
committed.toStatus=tombstoned
committed.correlationId=pending.eventId
```

When accepted, the classifier reports:

```text
currentFactsStatus=recorded_observation
recordedSelectedObservationResultClass=AUDIT_SELECTED_CORRELATION_OBSERVED
classification.resultClass=AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING
readinessClass=SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING
reviewClass=SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE
stageClass=WAIT_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF
resolutionClass=PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY
nextAllowedAction=execute_one_bounded_public_default_recall_suppression_proof_only
```

## Boundary

CM-1152 does not execute the recall suppression proof.

It does not call `record_memory`, `search_memory`, or `memory_overview`; does not read true audit logs, raw memory, raw audit, diary, or `.jsonl`; does not call providers; does not write durable memory/audit state; does not apply cleanup/rollback/migration/import/export/backup/restore; does not change public MCP/config/watchdog/startup/package/dependency; does not push; and does not claim readiness or reliability.

## Decision

After CM-1152 is committed and rerun from a clean HEAD, the next allowed action is exactly one bounded public/default recall suppression proof, if the clean rerun preserves `PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY`.

No blocker downgrade, recall reliability claim, write reliability claim, runtime readiness claim, or RC readiness claim is allowed from CM-1152 alone.
