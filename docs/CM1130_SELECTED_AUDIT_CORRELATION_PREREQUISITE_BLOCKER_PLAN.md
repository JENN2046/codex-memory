# CM-1130 Selected Audit Correlation Prerequisite Blocker Plan

Status: `CM1130_SELECTED_AUDIT_CORRELATION_PREREQUISITE_BLOCKER_PLAN_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1130 turns the CM-1129 current-facts downgrade-review result into an ordered prerequisite blocker plan.

It is an operator guard only. It does not approve or execute CM-1111, CM-1115, CM-1120, or any selected audit observation.

## Added Surface

```text
helper=src/core/SelectedAuditCorrelationPrerequisiteBlockerPlan.js
cli=src/cli/selected-audit-correlation-current-facts-prerequisite-plan.js
tests=tests/selected-audit-correlation-prerequisite-blocker-plan.test.js
tests=tests/selected-audit-correlation-current-facts-prerequisite-plan-cli.test.js
```

The helper consumes an explicit CM-1129-shaped report. The CLI composes CM-1129 read-only current-facts downgrade review with the CM-1130 helper.

## Current Real Smoke

```text
status=blocked
decision=SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREREQUISITE_PLAN_CLASSIFIED_NOT_EXECUTED
readinessClass=BLOCKED_PREFLIGHT_NOT_READY
reviewClass=BLOCKED_CURRENT_FACTS_NOT_READY
planClass=BLOCKED_PREREQUISITES_PENDING
prerequisiteBlockers=dirty_worktree,prior_result_CM-1111_missing,prior_result_CM-1115_missing
blockerDowngradeAllowed=false
cm1120ExecutionAllowedNow=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

Required next actions from current facts:

```text
resolve_dirty_worktree_or_isolate_verified_scope_without_overwriting_user_work
obtain_separate_exact_cm1111_retention_apply_approval
execute_cm1111_only_if_approved_and_record_result_class
obtain_separate_exact_cm1115_metadata_verify_approval_after_cm1111
execute_cm1115_only_if_approved_and_record_result_class
rerun_cm1129_current_facts_downgrade_review_after_prerequisites
keep_cm1120_blocked_until_cm1129_allows_next_stage
keep_readiness_and_reliability_unclaimed
```

These are prerequisites, not authorizations.

## Boundaries

- No CM-1111 approval or execution.
- No CM-1115 approval or execution.
- No CM-1120 approval or execution.
- No true audit log read.
- No observation input read.
- No raw audit read.
- No direct `.jsonl` read.
- No raw memory, raw store, diary, or metadata store read.
- No `record_memory`.
- No `search_memory`.
- No `memory_overview`.
- No durable project memory/audit write.
- No retention/tombstone/cleanup/rollback/migration/import/export/backup/restore apply.
- No provider/API call.
- No public MCP expansion.
- No config/watchdog/startup/package change.
- No push/tag/release/deploy/cutover.
- No readiness or reliability claim.

## Interpretation

CM-1130 does not make CM-1120 executable. It makes the current blocker chain explicit and machine-readable.

Current state remains `NOT_READY_BLOCKED` / `RC_NOT_READY_BLOCKED`. A future narrow downgrade still requires separate exact approvals, required prior result classes, selected sanitized observation, follow-up evidence, and a favorable CM-1128/CM-1129 review.
