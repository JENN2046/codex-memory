# CM-1140 Prerequisite Resolution Sequence

Status: `CM1140_PREREQUISITE_RESOLUTION_SEQUENCE_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1140 turns the CM-1139 stage-gate result into a machine-checkable prerequisite resolution sequence.

It does not request approval and does not execute any prerequisite. It exists to prevent these invalid jumps:

- full tests passed -> request CM-1111
- full tests passed -> request CM-1115
- full tests passed -> request CM-1120
- dirty scope reviewed -> execute apply or selected audit observation

## Added Surfaces

```text
src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence.js
src/cli/selected-audit-correlation-current-facts-resolution-sequence.js
tests/selected-audit-correlation-prerequisite-resolution-sequence.test.js
tests/selected-audit-correlation-current-facts-resolution-sequence-cli.test.js
```

The helper consumes a CM-1131/CM-1139 stage-gate report and returns one of:

```text
BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED
WAIT_CM1111_APPROVAL_PACKET_ONLY
WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111
WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS
NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY
FAIL_CLOSED_REPORT_MISSING
FAIL_CLOSED_UNSUPPORTED_STAGE_CLASS
FAIL_CLOSED_OVERCLAIM_OR_EXECUTION_SIGNAL
FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL
```

## Real Current-Facts Result

Command:

```powershell
node .\src\cli\selected-audit-correlation-current-facts-resolution-sequence.js --json --pretty
```

Observed result after adding this CM-1140 record:

```text
status=blocked
decision=SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_CLASSIFIED_NOT_EXECUTED
currentFactsStatus=blocked
stageClass=BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL
resolutionClass=BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED
dirtyStatusLineCount=92
nextAllowedAction=local_dirty_scope_isolation_decision_only
nextApprovalTarget=none
approvalRequestCandidate=none
cm1111ApprovalRequestAllowed=false
cm1115ApprovalRequestAllowed=false
cm1120ApprovalRequestAllowed=false
cm1111ExecutionAuthorizedNow=false
cm1115ExecutionAuthorizedNow=false
cm1120ExecutionAuthorizedNow=false
blockerDowngradeRecordAllowed=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

Current ordered resolution steps:

```text
provide_exact_cm1135_local_commit_isolation_approval_line_or_choose_review_only_path
rerun_cm1136_preflight_and_cm1137_dry_run_plan
execute_local_commit_isolation_only_if_separately_approved
rerun_cm1131_cm1139_stage_gate_after_worktree_is_clean_or_isolated
```

CM-1141 update: the old CM-1135 approval line is stale for the current dirty worktree. The practical next safe step is now to review the expanded dirty scope and draft a fresh local commit isolation packet, not to reuse the CM-1135 line.

## Validation

```text
node --check .\src\core\SelectedAuditCorrelationPrerequisiteResolutionSequence.js
node --check .\src\cli\selected-audit-correlation-current-facts-resolution-sequence.js
node --check .\tests\selected-audit-correlation-prerequisite-resolution-sequence.test.js
node --check .\tests\selected-audit-correlation-current-facts-resolution-sequence-cli.test.js
node --test .\tests\selected-audit-correlation-prerequisite-resolution-sequence.test.js .\tests\selected-audit-correlation-current-facts-resolution-sequence-cli.test.js
```

Targeted CM-1140 tests passed `9/9`.

## Boundary

CM-1140 did not:

- stage files
- commit
- push
- clean, reset, restore, or delete files
- request approval for CM-1111
- request approval for CM-1115
- request approval for CM-1120
- execute CM-1111
- execute CM-1115
- execute CM-1120
- read true audit logs
- read observation input
- read raw audit
- read direct `.jsonl`
- read raw memory, raw store, diary, or metadata store
- call `record_memory`
- call `search_memory`
- call `memory_overview`
- write durable project memory or audit
- execute retention, tombstone, cleanup, rollback, migration, import, export, backup, or restore apply
- call provider, model, or API services
- expand public MCP tools
- change config, watchdog, startup, package, or lockfile surfaces
- tag, release, deploy, or cut over
- claim memory recall reliable
- claim memory write reliable
- claim `RC_READY`

## Current Interpretation

CM-1140 makes the current prerequisite order explicit:

```text
dirty worktree isolation must come before CM-1111/CM-1115/CM-1120 approval requests.
```

Current state remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
