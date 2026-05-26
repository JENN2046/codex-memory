# CM-1141 Stale Local Commit Approval Scope Guard

Status: `CM1141_STALE_LOCAL_COMMIT_APPROVAL_SCOPE_GUARD_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1141 closes a narrow authorization-safety gap in the CM-1135 -> CM-1136 -> CM-1137 dirty-worktree isolation rail.

CM-1135 drafted one exact approval line for a possible one-local-commit isolation action over the dirty scope that existed at that time. Later CM-1136 through CM-1140 added more dirty files. Without an explicit stale-scope guard, a user could repeat the old CM-1135 exact line and CM-1136 could accept a broader current dirty scope than the packet originally described.

CM-1141 makes that fail closed.

## Changed Surfaces

```text
src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js
tests/selected-audit-correlation-local-commit-isolation-preflight.test.js
tests/selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
tests/selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
```

The preflight now returns:

```text
BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED
```

when the CM-1135 exact approval line is supplied but the current dirty scope includes post-packet CM docs or post-packet local-commit/resolution implementation paths.

## Real Current-Facts Result

Command shape:

```powershell
node -e "const {REQUIRED_APPROVAL_LINE}=require('./src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight'); const {buildReport}=require('./src/cli/selected-audit-correlation-local-commit-isolation-preflight'); const report=buildReport({approvalLine: REQUIRED_APPROVAL_LINE, json: true, pretty: true}); console.log(JSON.stringify({status: report.status, preflightClass: report.preflightClass, dirtyLineCount: report.dirtyLineCount, unknownDirtyLineCount: report.unknownDirtyLineCount, approvalLineAccepted: report.approvalLineAccepted, localCommitExecutionAllowedNow: report.localCommitExecutionAllowedNow, commitAuthorized: report.commitAuthorized, pushAuthorized: report.pushAuthorized, readinessClaimAllowed: report.readinessClaimAllowed, reliabilityClaimAllowed: report.reliabilityClaimAllowed, approvalScopeExpansionCount: report.preflight && report.preflight.approvalScopeExpansionPaths ? report.preflight.approvalScopeExpansionPaths.length : 0}, null, 2));"
```

Observed result after recording this CM-1141 document:

```text
status=blocked
preflightClass=BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED
dirtyLineCount=93
unknownDirtyLineCount=0
approvalLineAccepted=true
localCommitExecutionAllowedNow=false
commitAuthorized=false
pushAuthorized=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
approvalScopeExpansionCount=18
```

## Interpretation

The old CM-1135 line is now stale for the current worktree.

Current next safe action changes from:

```text
provide_exact_cm1135_local_commit_isolation_approval_line
```

to:

```text
draft_fresh_local_commit_isolation_packet_after_reviewing_expanded_dirty_scope
```

That future packet would still be draft-only unless the user later provides a separate exact approval.

## Validation

```text
node --check .\src\core\SelectedAuditCorrelationLocalCommitIsolationPreflight.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-preflight.test.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
node --check .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
node --test .\tests\selected-audit-correlation-local-commit-isolation-preflight.test.js .\tests\selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
node --test .\tests\selected-audit-correlation-local-commit-isolation-preflight.test.js .\tests\selected-audit-correlation-local-commit-isolation-preflight-cli.test.js .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan.test.js .\tests\selected-audit-correlation-local-commit-isolation-dry-run-plan-cli.test.js
```

Targeted CM-1136/CM-1141 preflight tests passed `10/10`.
Adjacent CM-1136/CM-1137 regression tests passed `18/18`.

## Boundary

CM-1141 did not:

- stage files
- commit
- push
- clean, reset, restore, or delete files
- request approval for a new local commit isolation packet
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

Current state remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
