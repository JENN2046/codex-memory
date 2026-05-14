# P12.5 Validate Memory Runtime Implementation Plan

Updated: 2026-05-14

## Purpose

This document freezes the implementation and test design for the narrow internal `validate_memory` runtime path.

Repository reality: the internal implementation has already landed in `origin/main` at `29c7ad8`. This phase is docs/tests-design only and does not change `src/`. It records the plan shape, test matrix, audit contract, and rollback story before any further runtime changes, public MCP proposal, or broader mutation work.

## Scope

Allowed runtime behavior:

- Candidate: `validate_memory`
- Runtime surface: internal service only
- Allowed transitions:
  - `proposal -> active`
  - `stale -> active`
- Required apply flags:
  - `dry_run=false`
  - `confirm=true`
- Required inputs:
  - `memory_id`
  - `reason`
  - `evidence`
  - `actor_client_id`
  - `request_source`

Forbidden behavior:

- No public MCP tool expansion
- No MCP schema change
- No `update_memory` runtime
- No `supersede_memory` runtime
- No `forget_memory` runtime
- No `checkpoint_memory` runtime
- No `handoff_memory` runtime
- No hard delete
- No SQLite migration
- No automatic `ALTER TABLE`
- No provider call
- No write without audit
- No mutation without previous status check
- No cross-client private mutation
- No revive of `rejected`, `tombstoned`, or `superseded` by default

## Component Plan

### ValidateMemoryService

`ValidateMemoryService` owns the internal mutation decision.

Responsibilities:

- Validate arguments against an internal schema through `ToolArgumentValidator`.
- Keep dry-run as the default path.
- Require `confirm=true` when `dry_run=false`.
- Run `SecretScanner` before any durable write.
- Load the current record and lifecycle/scope policy data before mutation.
- Allow only `proposal/stale -> active`.
- Reject forbidden lifecycle states.
- Reject cross-client private mutations.
- Build a `memory_validate` audit event before applying.
- Apply the lifecycle update only through a status-checked store helper.
- Append audit only after the lifecycle update succeeds.

Non-responsibilities:

- It does not expose a public MCP tool.
- It does not write diary files.
- It does not write vector/chunk indexes.
- It does not migrate SQLite schema.
- It does not implement any other controlled-write candidate.

### SqliteShadowStore

`SqliteShadowStore` provides two narrow helpers:

- `getRecordValidationPolicy(memoryId)`
- `updateLifecycleStatus({ memoryId, fromStatus, toStatus, updatedAt, actorClientId, reason })`

Design rules:

- The helpers must use the existing `memory_records` table only.
- The helpers must check whether lifecycle columns already exist.
- Missing lifecycle status support must fail safe.
- Apply must update by `memory_id` and previous `status`, so stale reads cannot silently overwrite a concurrent transition.
- Optional lifecycle metadata columns may be populated only if already present.
- The helpers must not create columns, indexes, tables, or migrations.

### app.js

`app.js` may wire `ValidateMemoryService` into the internal service bundle.

Boundary:

- Internal `services.validateMemoryService` is allowed.
- `callTool('validate_memory')` is not allowed without a separate public MCP proposal approval.
- `TOOL_DEFINITIONS` must remain unchanged unless a later approved MCP phase explicitly expands it.

### Audit Write

Confirmed mutation must write a `memory_validate` audit event.

Required event fields:

- `event_id`
- `memory_id`
- `event_type`
- `tool_name`
- `actor_client_id`
- `request_source`
- `from_status`
- `to_status`
- `reason`
- `evidence`
- `created_at`
- `reversible`
- `previous_snapshot_ref`
- `redaction_applied`
- `lifecycle_policy_applied`
- `scope_policy_applied`

Audit rules:

- Dry-run returns an audit preview and writes no audit.
- Rejected requests write no audit.
- Confirmed successful mutation writes audit after the lifecycle update succeeds.
- Audit output must not expose raw secrets.
- Low-risk summaries must not expose raw `workspace_id`.

## Test Matrix

Targeted runtime tests:

| Case | Expected Result |
|---|---|
| default invocation with no `dry_run=false` | `decision=dry-run`, `mutated=false`, no status update, no audit append |
| `proposal -> active` with `dry_run=false` and `confirm=true` | status becomes `active`, audit event appended |
| `stale -> active` with `dry_run=false` and `confirm=true` | status becomes `active`, audit event appended |
| `rejected -> active` | rejected, no mutation |
| `tombstoned -> active` | rejected, no mutation |
| `superseded -> active` | rejected, no mutation |
| missing `reason` or `evidence` | rejected by validation, no mutation |
| unexpected argument | rejected by `ToolArgumentValidator`, no mutation |
| secret-like reason/evidence | rejected by `SecretScanner`, no raw secret in output |
| cross-client private record | rejected, no mutation |
| missing lifecycle status column | rejected fail-safe, no schema change |
| public MCP tools list | remains `record_memory`, `search_memory`, `memory_overview` |

Regression gates:

```powershell
node --test tests\validate-memory-runtime-fixture.test.js
node --test tests\validate-memory-runtime.test.js
npm test
npm run gate:ci
npm run gate:mainline:strict
npm run lifecycle:sqlite:dry-run -- --json
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Rollback Story

Code rollback:

- Revert the implementation commit if needed.
- Removing the internal service wiring restores the previous state because no public MCP tool depends on it.
- Existing public MCP clients remain compatible because public tools are unchanged.

Data rollback:

- Dry-run path has no durable side effect.
- Confirmed mutation changes only lifecycle status for an existing row.
- The audit event includes `previous_snapshot_ref` with the previous status.
- A manual rollback can restore the prior status using the audited `memory_id` and `previous_snapshot_ref`.
- No diary/vector/chunk rebuild is required because the internal path does not write those stores.

Migration rollback:

- No migration is performed.
- Existing DBs without lifecycle status support reject `validate_memory`.
- The safe next step for schema gaps remains `npm run lifecycle:sqlite:dry-run -- --json`, followed by a separate explicit migration approval if needed.

## Next Decision Gate

Next safe decisions:

- Keep `validate_memory` internal-only.
- Add an internal CLI wrapper that calls the service, still without MCP expansion.
- Open a public MCP proposal review for `validate_memory`.

Public MCP expansion, schema changes, SQLite migration, or broader mutation tools remain separate approval gates.
