# CM-1085 Memory Write Rollback Cleanup Apply Design Policy

Status: `APPLY_DESIGN_REVIEW_ONLY_NOT_APPLIED_NOT_READY`

## Purpose

CM-1085 adds a machine-checkable apply design review policy for future rollback cleanup.

It does not execute cleanup, does not apply rollback, does not delete diary records, does not rewrite audit logs, does not mutate stores, and does not claim cleanup safety, rollback safety, write reliability, or readiness.

## Input Boundary

The policy consumes:

```yaml
storeBackedPreviewReport: accepted CM-1062 store-backed dry-run preview
applyDesign:
  mode: cleanup_rollback_apply_design_review_only
  scope: memory_id_and_store_kind_scoped
  target: process
  memoryId: exact memory id from the CM-1062 preview
  plannedActionIds: exact action/store/storeKind ids from the CM-1062 preview
```

The CM-1062 preview must remain no-apply:

```yaml
storeBackedDryRunPreviewAccepted: true
applyAuthorized: false
applyExecuted: false
cleanupApplyRunsAllowed: 0
rollbackApplyRunsAllowed: 0
plannedActions[].applies: false
```

## Required Apply Design Flags

The design must require:

```yaml
applyDesignReviewOnly: true
usesAcceptedStoreBackedPreview: true
exactMemoryIdConfirmed: true
storeKindScoped: true
preservesUnrelatedMemoryIds: true
retainsDiary: true
retainsAuditAppendOnly: true
requiresSeparateCleanupApplyApproval: true
requiresSeparateRollbackApplyApproval: true
requiresRuntimeValidationBeforeApply: true
requiresOperatorReceiptBeforeApply: true
requiresPostApplyVerification: true
requiresRollbackPlan: true
stopsBeforeApply: true
```

It must also keep forbidden actions false:

```yaml
cleanupApplyApproved: false
rollbackApplyApproved: false
executesCleanup: false
appliesRollback: false
deletesDiary: false
rewritesAudit: false
expandsPublicMcp: false
changesConfigWatchdogStartup: false
changesDependencies: false
claimsRealCleanupSafe: false
claimsRealRollbackSafe: false
claimsWriteReliable: false
claimsReadiness: false
```

## Apply Gate

Accepted output still stops before apply:

```yaml
gateMode: design_review_only_separate_apply_approval_required
applyDesignAccepted: true
cleanupApplyAuthorized: false
rollbackApplyAuthorized: false
applyExecuted: false
cleanupApplyRunsAllowed: 0
rollbackApplyRunsAllowed: 0
destructiveActionAllowed: false
runtimeValidationRequiredBeforeApply: true
operatorReceiptRequiredBeforeApply: true
postApplyVerificationRequired: true
nextAllowedAction: request_separate_cleanup_apply_approval_packet
```

Any cleanup apply, rollback apply, diary deletion, audit rewrite, public MCP expansion, config/watchdog/startup change, dependency change, readiness claim, or reliability claim blocks the design.

## Non-Claims

CM-1085 does not prove:

- real cleanup safety
- real rollback safety
- rollback readiness
- write reliability
- runtime readiness
- RC readiness
- production readiness

## Validation

Targeted validation:

```powershell
node --check .\src\core\MemoryWriteRollbackCleanupApplyDesignPolicy.js
node --check .\tests\memory-write-rollback-cleanup-apply-design-policy.test.js
node --test .\tests\memory-write-rollback-cleanup-apply-design-policy.test.js
node --test .\tests\memory-write-rollback-cleanup-dry-run-preview.test.js
node --test .\tests\memory-write-rollback-cleanup-store-backed-dry-run-preview.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```
