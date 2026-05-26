# CM-1128 Selected Audit Correlation Blocker Downgrade Review Guard

Status: `CM1128_SELECTED_AUDIT_CORRELATION_BLOCKER_DOWNGRADE_REVIEW_GUARD_COMPLETED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1128 adds a pure explicit-input review guard for the CM-1127 readiness report.

It answers one narrow question:

```text
Does the supplied selected-audit-correlation readiness report allow a narrow blocker downgrade?
```

It does not collect current facts by itself. The current-facts source remains CM-1127.

## Added Surface

```text
src/core/SelectedAuditCorrelationBlockerDowngradeReview.js
tests/selected-audit-correlation-blocker-downgrade-review.test.js
```

The helper consumes only a caller-provided readiness report shape and returns a review class.

## Review Classes

```text
BLOCKED_CURRENT_FACTS_NOT_READY
READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE
SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE
DOWNGRADE_ALLOWED_NARROW_NOT_READY
FAIL_CLOSED_REPORT_MISSING
FAIL_CLOSED_OVERCLAIM_SIGNAL
FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL
FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL
FAIL_CLOSED_UNFAVORABLE_READINESS
```

Only this class allows a downgrade:

```text
DOWNGRADE_ALLOWED_NARROW_NOT_READY
```

Its downgrade scope is limited to:

```text
one_exact_selected_audit_correlation_blocker_only
```

It still keeps:

```text
readinessClaimAllowed=false
reliabilityClaimAllowed=false
readinessAcceptedAsEvidence=false
reliabilityAcceptedAsEvidence=false
```

## Current Meaning

When the helper consumes the current CM-1127 dirty-worktree readiness report, it returns:

```text
reviewClass=BLOCKED_CURRENT_FACTS_NOT_READY
blockerDowngradeAllowed=false
currentFactsBlockerReasons=dirty_worktree,prior_result_CM-1111_missing,prior_result_CM-1115_missing
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

With synthetic clean current facts and satisfied prior-result fixtures, it still returns:

```text
READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE
```

because no selected audit observation has been executed.

## Validation

```text
node --check .\src\core\SelectedAuditCorrelationBlockerDowngradeReview.js
node --check .\tests\selected-audit-correlation-blocker-downgrade-review.test.js
node --test .\tests\selected-audit-correlation-blocker-downgrade-review.test.js
node --test .\tests\selected-audit-correlation-blocker-downgrade-review.test.js .\tests\selected-audit-correlation-current-facts-readiness-cli.test.js .\tests\selected-audit-correlation-execution-readiness.test.js .\tests\selected-audit-correlation-result-classifier.test.js
```

Targeted test covers:

- current dirty CM-1127 readiness -> `BLOCKED_CURRENT_FACTS_NOT_READY`
- preflight-ready no-observation readiness -> `READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE`
- favorable selected evidence -> narrow not-ready downgrade only
- readiness/reliability overclaim rejection
- side-effect signal rejection
- nested readiness safety side-effect signal rejection
- inconsistent downgrade flag rejection
- favorable readiness class without downgrade flag rejection

## Boundary

CM-1128 does not:

- approve CM-1120
- execute CM-1120
- collect Git facts
- read true audit logs
- read observation input
- read raw audit, raw memory, store, diary, `.jsonl`, or metadata store
- call `record_memory`
- call `search_memory`
- call `memory_overview`
- run `tombstone-memory`
- write durable project memory or audit
- apply retention, tombstone, cleanup, rollback, migration, import, export, backup, or restore
- call provider/model/API
- expand public MCP tools
- change config, watchdog, startup, package, or lockfile
- push, tag, release, deploy, or cut over
- claim `memory write reliable`, `memory recall reliable`, runtime readiness, RC readiness, production readiness, release readiness, or cutover readiness
