# CM-1181 Startup Explicit Rebuild Recovery Policy Plan

Date: 2026-05-26

Status: `CM1181_STARTUP_EXPLICIT_REBUILD_RECOVERY_POLICY_PLAN_COMPLETED_NOT_IMPLEMENTED_NOT_READY`

## Current Source Facts

Current source already has recovery building blocks, but they are not a startup auto-apply policy:

- `MemoryWriteService.rebuildMissingDiaryProjections(...)` can rebuild missing diary projections from SQLite authoritative write manifests when explicitly called.
- `MemoryWriteReconcileWorker` supports `start(...)`, `stop(...)`, and `runOnce(...)`, and reports selected status through `getStatus()`.
- The worker can run in `dryRun` mode.
- HTTP health can expose selected worker status, but this is observability, not an automatic recovery approval.

Current source does not define a single startup policy that says exactly which recovery actions may run automatically, which must be dry-run only, and which require explicit approval.

## Planned Policy

Future implementation should keep startup recovery fail-closed:

1. Startup may inspect and report recovery posture.
2. Startup may expose selected, sanitized counts for pending manifests, degraded manifests, missing diary projections, and queued reconcile tasks.
3. Startup must not silently rebuild diary projections.
4. Startup must not silently replay reconcile tasks in apply mode.
5. Startup must not change config/watchdog/startup persistence.
6. Recovery apply paths should require an explicit operator action, exact bounded scope, validation plan, and rollback/cleanup path.

Recommended startup decision classes:

- `startup_recovery_not_needed`
- `startup_recovery_inspection_available`
- `startup_recovery_dry_run_available`
- `startup_recovery_apply_blocked_approval_required`
- `startup_recovery_blocked_schema_gate`
- `startup_recovery_blocked_unknown_state`

## Non-Goals

CM-1181 does not implement startup recovery.

It does not start or install a worker, does not change service startup, does not run rebuild/reconcile apply, does not run real recovery, does not mutate durable memory or audit state, does not change config/watchdog/startup, and does not claim readiness or reliability.

## Future Acceptance Criteria

A later implementation should prove with temp-local tests:

- startup inspection can report zero-action clean state
- pending/degraded/missing-projection state is reported without apply
- dry-run recovery preview reports selected counts without mutation
- apply mode is blocked unless explicit approval context is present
- schema gate blockers stop recovery before rebuild/reconcile
- output is sanitized and does not include raw memory content
- public MCP tools remain unchanged
- no provider/API call occurs
- no readiness or reliability claim is emitted

## Decision

`CM1181_STARTUP_EXPLICIT_REBUILD_RECOVERY_POLICY_PLAN_COMPLETED_NOT_IMPLEMENTED_NOT_READY`

This plan keeps recovery explicit. Startup may become an inspection/reporting surface, but rebuild/reconcile apply remains blocked until a later exact source/test implementation and, for real stores, separate explicit approval.
