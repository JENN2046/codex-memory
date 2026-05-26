# CM-1137 Local Commit Isolation Dry-Run Plan

Status: `CM1137_LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1137 adds a dry-run-only plan layer after CM-1136 local commit isolation preflight.

The goal is to make a future local commit isolation action easier to review without turning the CM-1135 draft approval packet or CM-1136 preflight into execution authority.

## Added Surfaces

```text
src/core/SelectedAuditCorrelationLocalCommitIsolationDryRunPlan.js
src/cli/selected-audit-correlation-local-commit-isolation-dry-run-plan.js
tests/selected-audit-correlation-local-commit-isolation-dry-run-plan.test.js
tests/selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
```

The helper consumes an explicit CM-1136 preflight report and returns one of:

```text
BLOCKED_PREFLIGHT_NOT_ACCEPTED
FAIL_CLOSED_MUTATION_OR_OVERCLAIM_SIGNAL
LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED
```

Even when CM-1136 is accepted, CM-1137 remains dry-run-only. It may list intended action names, but it does not prepare executable stage or commit commands.

## Real Smoke Result

Command:

```powershell
node .\src\cli\selected-audit-correlation-local-commit-isolation-dry-run-plan.js --json --pretty
```

Observed result after adding the CM-1137 documentation/status surfaces:

```text
status=blocked
decision=SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_EVALUATED_NOT_EXECUTED
preflightClass=BLOCKED_APPROVAL_MISSING
planClass=BLOCKED_PREFLIGHT_NOT_ACCEPTED
branch=main
head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
inventoryClass=KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN
dirtyLineCount=85
unknownDirtyLineCount=0
planPrepared=false
stageCommandsPrepared=false
commitCommandPrepared=false
commitExecutableNow=false
pushExecutableNow=false
cleanExecutableNow=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

## Validation

```text
node --check .\src\core\SelectedAuditCorrelationLocalCommitIsolationDryRunPlan.js
node --check .\src\cli\selected-audit-correlation-local-commit-isolation-dry-run-plan.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan.test.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
node --test .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan.test.js .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
```

Targeted CM-1137 tests passed `7/7`.

Closeout validation also includes adjacent CM-1132/CM-1136 regression tests, docs validation, ledger consistency, `git diff --check`, focused no-overclaim/secret scans, and changed-scope review.

## Boundary

CM-1137 did not:

- stage files
- commit
- push
- clean, reset, restore, or delete files
- approve or execute CM-1111
- approve or execute CM-1115
- approve or execute CM-1120
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

CM-1137 is execution-planning evidence only.

It improves the local review rail for a possible future exact-approved one-local-commit isolation, but it does not consume approval, execute isolation, clean the worktree, unlock CM-1111/CM-1115/CM-1120, prove selected audit correlation, prove metadata lifecycle, prove public/default recall suppression, prove write reliability, prove recall reliability, or change readiness.

Current state remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
