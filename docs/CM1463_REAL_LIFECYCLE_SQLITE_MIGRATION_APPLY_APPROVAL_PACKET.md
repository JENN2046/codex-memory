# CM-1463 Real Lifecycle SQLite Migration Apply Approval Packet

Date: 2026-06-04

## Purpose

This packet prepares a future exact-approved real lifecycle SQLite migration apply.

This packet does not authorize or execute real DB migration apply.

CM-1463 is docs-only approval preparation. It defines the operator approval shape, required evidence, rollback plan, and hard safety boundaries for a later apply against one explicitly named durable SQLite DB.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Migration Target

A future lifecycle migration apply is expected to ensure these columns exist on the lifecycle-capable SQLite memory records surface:

- `status`
- `status_reason`
- `supersedes_memory_id`
- `superseded_by_memory_id`
- `tombstone_reason`
- `lifecycle_updated_at`
- `lifecycle_actor_client_id`

## Pre-Apply Requirements

A future real apply must not start unless all of these are true and captured in the receipt:

- fresh `git status`
- `HEAD == origin/main`
- worktree clean
- fresh backup path
- backup file exists after backup
- dry-run report captured
- operator exact approval
- single target DB path
- no broad raw export
- no provider/API
- no MCP memory tools

If any pre-apply requirement is missing, stop before apply and report `CM1463_HARD_STOP_REQUIRED`.

## Exact Approval Shape

A future operator approval must provide these fields exactly:

```yaml
approval_id: CM1463-REAL-LIFECYCLE-MIGRATION-APPLY-<date>
target_db_path: <absolute path>
backup_path: <absolute path>
expected_columns:
  - status
  - status_reason
  - supersedes_memory_id
  - superseded_by_memory_id
  - tombstone_reason
  - lifecycle_updated_at
  - lifecycle_actor_client_id
allowed_command: npm run lifecycle:sqlite:migrate -- --confirm --backup <backup_path>
operator_acknowledges:
  - real durable SQLite DB may be modified
  - backup is required before apply
  - rollback uses backup restore
  - no RC_READY claim follows from migration alone
```

The approval must name one absolute `target_db_path` and one absolute `backup_path`. A generic approval, missing backup path, broad workspace target, or approval that changes the command shape is not sufficient.

## Future Apply Command

Documented future apply command only. Do not run during CM-1463:

```powershell
npm run lifecycle:sqlite:migrate -- --confirm --backup <backup_path>
```

Documented dry-run command:

```powershell
npm run lifecycle:sqlite:migrate -- --json
```

The dry-run command may be used in a future approval flow to capture pre-apply and post-apply summaries. The apply command requires the exact approval shape above.

## Rollback Plan

If a future apply fails or produces an unacceptable result:

1. Stop service if running.
2. Copy current DB aside as failed-apply artifact.
3. Restore backup DB over target DB.
4. Rerun dry-run.
5. Rerun selected read-only health checks.
6. Record rollback receipt.
7. Do not claim readiness.

Rollback evidence must avoid raw memory export, raw audit dump, provider/API calls, bearer-token use, and MCP memory tools unless a separate exact approval explicitly covers them.

## Evidence Required After Future Apply

A future apply receipt must include:

- backup path
- backup size/hash if available
- target DB path
- pre-apply dry-run summary
- apply result summary
- post-apply dry-run summary
- schema columns present
- mutation count
- git state
- no provider/API
- no MCP memory calls
- no raw export
- no readiness claim

The receipt must distinguish schema evidence from runtime readiness evidence. Migration success alone does not prove lifecycle behavior, public mutation safety, recall quality, release readiness, or `RC_READY`.

## Explicit Non-Claims

Real DB migration apply does not imply `RC_READY`.

Real DB migration apply does not imply release readiness.

Real DB migration apply does not approve mutation tools.

Real DB migration apply does not approve raw audit/store access.

Real DB migration apply does not approve provider/bearer/live runtime boundaries.

## CM-1463 Boundary Receipt

CM-1463 did not execute real DB migration apply.

CM-1463 did not run `--confirm` migration execution against a durable memory DB.

CM-1463 did not edit or delete a real SQLite DB.

CM-1463 did not read raw memory rows broadly, scan raw audit, dump raw JSONL, call provider/API, use bearer token, call live MCP memory tools, register mutation tools, expand public MCP tools, change config/watchdog/startup, change dependencies, release/tag/deploy, push, or claim readiness / `RC_READY`.
