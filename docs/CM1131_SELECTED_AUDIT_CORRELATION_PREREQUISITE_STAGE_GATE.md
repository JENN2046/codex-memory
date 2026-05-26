# CM-1131 Selected Audit Correlation Prerequisite Stage Gate

Status: `CM1131_SELECTED_AUDIT_CORRELATION_PREREQUISITE_STAGE_GATE_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1131 converts the CM-1130 prerequisite blocker plan into a strict stage gate.

It prevents a prerequisite action list from being misread as execution authorization. It names the next approval target, if any, while keeping every execution flag false.

## Added Surface

```text
helper=src/core/SelectedAuditCorrelationPrerequisiteStageGate.js
cli=src/cli/selected-audit-correlation-current-facts-stage-gate.js
tests=tests/selected-audit-correlation-prerequisite-stage-gate.test.js
tests=tests/selected-audit-correlation-current-facts-stage-gate-cli.test.js
```

The helper consumes explicit CM-1130-shaped input. The CLI composes CM-1130 read-only current-facts prerequisite plan with the CM-1131 stage gate.

## Current Real Smoke

```text
status=blocked
decision=SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_STAGE_GATE_CLASSIFIED_NOT_EXECUTED
planClass=BLOCKED_PREREQUISITES_PENDING
stageClass=BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL
currentFactsBlockerReasons=dirty_worktree,prior_result_CM-1111_missing,prior_result_CM-1115_missing
nextApprovalTarget=none
cm1111ApprovalRequestAllowed=false
cm1115ApprovalRequestAllowed=false
cm1120ApprovalRequestAllowed=false
cm1111ExecutionAuthorizedNow=false
cm1115ExecutionAuthorizedNow=false
cm1120ExecutionAuthorizedNow=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

Current effect:

```text
true_audit_log_read=false
observation_input_read=false
memory_tools_called=false
apply_executed=false
readiness_claimed=false
reliability_claimed=false
```

## Stage Order

CM-1131 enforces this order:

1. Resolve or isolate dirty worktree without overwriting user-owned work.
2. Request separate exact CM-1111 approval only.
3. Execute CM-1111 only if separately approved and record the result class.
4. Request separate exact CM-1115 approval only after CM-1111 result exists.
5. Execute CM-1115 only if separately approved and record the result class.
6. Rerun CM-1129/CM-1130/CM-1131.
7. Request separate exact CM-1120 selected-observation approval only if the gate reaches that stage.

No stage authorizes execution by itself.

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

CM-1131 is an operator ordering guard, not live evidence. Current state remains `NOT_READY_BLOCKED` / `RC_NOT_READY_BLOCKED`.

The current gate blocks before any approval request because the worktree is dirty. Future approval requests remain separate exact actions and must not be inferred from this stage gate.
