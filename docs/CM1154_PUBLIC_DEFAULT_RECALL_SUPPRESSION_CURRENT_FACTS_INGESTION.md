# CM1154 Public Default Recall Suppression Current-Facts Ingestion

Status: `CM1154_PUBLIC_DEFAULT_RECALL_SUPPRESSION_CURRENT_FACTS_INGESTED_NOT_READY`
Date: 2026-05-26

## Purpose

CM-1154 lets the current-facts gate chain ingest the already-recorded CM-1153 public/default recall suppression proof.

Before this repair, CM-1153 was recorded, but the gates still routed to:

```text
resolutionClass=PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY
nextAllowedAction=execute_one_bounded_public_default_recall_suppression_proof_only
```

That could cause the same bounded proof to be repeated.

## Change

The current-facts classifier now reads only the sanitized CM-1153 record surface:

```text
docs/CM1153_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF.md
```

It accepts that surface only when the expected selected fields are present:

```text
resultClass=PUBLIC_DEFAULT_RECALL_SUPPRESSION_OBSERVED_NOT_READY
targetMemoryId=codex-process-50325be15fdb479d805728fe420b4838
searchMemoryCallCount=1
target=process
limit=5
includeContent=false
scopeProvided=false
noRawContentRead=true
readOnly=true
targetCurrentChunkCount>=1
defaultFilterTargetChunkCount=0
targetReturned=false
forbiddenResultFieldCount=0
providerFetchAttempts=0
recordMemoryCallCount=0
memoryOverviewCallCount=0
durableMemoryWrites=0
publicMcpExpansion=false
configWatchdogStartupPackageChange=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

When CM-1151 and CM-1153 are both accepted, the classifier sets:

```text
metadataLifecycleObserved=true
recallSuppressionObserved=true
classification.resultClass=AUDIT_SELECTED_CORRELATION_OBSERVED
```

The downstream gate chain then routes to:

```text
stageClass=NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY
resolutionClass=NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY
nextAllowedAction=record_narrow_selected_audit_correlation_blocker_downgrade_only
```

## Boundary

CM-1154 does not execute `search_memory`, `record_memory`, or `memory_overview`; does not call providers; does not read raw audit/raw memory/diary/`.jsonl`; does not write durable memory/audit; does not apply tombstone/cleanup/rollback/migration/import/export/backup/restore; does not change public MCP/config/watchdog/startup/package/dependency; does not push; and does not claim readiness or reliability.

It only consumes local sanitized status surfaces.

## Validation

Targeted current-facts tests passed:

```text
node --test .\tests\selected-audit-correlation-current-facts-classifier-cli.test.js .\tests\selected-audit-correlation-current-facts-readiness-cli.test.js .\tests\selected-audit-correlation-current-facts-downgrade-review-cli.test.js .\tests\selected-audit-correlation-current-facts-stage-gate-cli.test.js .\tests\selected-audit-correlation-current-facts-resolution-sequence-cli.test.js
```

Result:

```text
29/29 passed
```

## Next

After commit, rerun the real clean-head current-facts resolution sequence. If it still reports `NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY`, the next bounded local task is only a narrow downgrade record. No readiness or reliability claim is allowed.
