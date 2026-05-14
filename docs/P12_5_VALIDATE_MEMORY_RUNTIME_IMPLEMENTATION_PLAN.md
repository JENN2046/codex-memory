# P12.5 Validate Memory Runtime Implementation Plan

Updated: 2026-05-14

## Purpose

This document freezes the implementation and test design for the narrow internal `validate_memory` runtime path.

Repository reality: the internal implementation has already landed in `origin/main` at `29c7ad8`. Later internal safety reviews found two hardening gaps and one residual risk. The first patch added audit write-path preflight and policy-field guards. That preflight was a mitigation, not full mutation/audit atomicity. The current protocol writes a durable pending audit intent before lifecycle mutation, then appends a committed or cancelled follow-up. This document records the patched plan shape, test matrix, audit contract, and rollback story before any further runtime changes, public MCP proposal, or broader mutation work.

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
- Append a durable `audit_phase=pending` audit intent before confirmed mutation.
- Apply the lifecycle update only through a status-checked and policy-guarded store helper.
- Append `audit_phase=committed` after lifecycle update succeeds.
- Append `audit_phase=cancelled` after pending audit when lifecycle update fails.
- Return `validated-with-warning` with `auditCommitStatus=failed_after_mutation` if committed audit append fails after update; the durable pending audit intent remains the audit evidence.

Non-responsibilities:

- It does not expose a public MCP tool.
- It does not write diary files.
- It does not write vector/chunk indexes.
- It does not migrate SQLite schema.
- It does not implement any other controlled-write candidate.

### SqliteShadowStore

`SqliteShadowStore` provides two narrow helpers:

- `getRecordValidationPolicy(memoryId)`
- `updateLifecycleStatus({ memoryId, fromStatus, toStatus, updatedAt, actorClientId, reason, expectedClientId, expectedVisibility })`

Design rules:

- The helpers must use the existing `memory_records` table only.
- The helpers must check whether lifecycle columns already exist.
- Missing lifecycle status support must fail safe.
- Apply must update by `memory_id`, previous `status`, expected `client_id`, and expected `visibility`, so stale reads cannot silently overwrite a concurrent transition or a changed scope decision.
- Null or empty policy guard values must be explicit and must not silently match arbitrary non-empty values.
- Optional lifecycle metadata columns may be populated only if already present.
- The helpers must not create columns, indexes, tables, or migrations.

### app.js

`app.js` may wire `ValidateMemoryService` into the internal service bundle.

Boundary:

- Internal `services.validateMemoryService` is allowed.
- `callTool('validate_memory')` is not allowed without a separate public MCP proposal approval.
- `TOOL_DEFINITIONS` must remain unchanged unless a later approved MCP phase explicitly expands it.

### Audit Write

Confirmed mutation must use a two-phase `memory_validate` audit protocol.

Pending intent fields:

- `event_id`
- `memory_id`
- `event_type`
- `audit_phase`
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

Committed event fields:

- same `event_id` or `correlation_id`
- `audit_phase=committed`
- `mutation_applied=true`
- `memory_id`
- `from_status`
- `to_status`
- `committed_at`

Cancelled event fields:

- same `event_id` or `correlation_id`
- `audit_phase=cancelled`
- `mutation_applied=false`
- `cancel_reason`

Audit rules:

- Dry-run returns an audit preview and writes no audit.
- Rejected requests before confirmed apply write no audit.
- Confirmed mutation first appends a durable pending audit intent; if this append fails, `validate_memory` rejects with `mutated=false`.
- Confirmed successful mutation writes committed audit after the lifecycle update succeeds.
- If lifecycle update fails after pending audit, `validate_memory` appends a cancelled audit follow-up when possible and returns `mutated=false`.
- If committed audit append fails after lifecycle update, `validate_memory` returns `validated-with-warning` and `auditCommitStatus=failed_after_mutation`; the pending audit intent must already be durable.
- JSONL audit and SQLite lifecycle update are still not one physical transaction.
- True single-transaction audit would require a future SQLite-backed audit table or migration, which remains unapproved.
- Audit output must not expose raw secrets.
- Low-risk summaries must not expose raw `workspace_id`.

## Test Matrix

Targeted runtime tests:

| Case | Expected Result |
|---|---|
| default invocation with no `dry_run=false` | `decision=dry-run`, `mutated=false`, no status update, no audit append |
| pending audit before update | pending audit exists before `updateLifecycleStatus` is called |
| `proposal -> active` with `dry_run=false` and `confirm=true` | status becomes `active`, pending and committed audit entries appended |
| `stale -> active` with `dry_run=false` and `confirm=true` | status becomes `active`, pending and committed audit entries appended |
| pending audit append failure before confirmed apply | rejected, `mutated=false`, no status update, no audit append |
| update failure after pending audit | rejected, `mutated=false`, status unchanged, pending and cancelled audit entries appended if possible |
| committed audit append failure after update | status becomes `active`, pending audit remains durable, result reports `auditCommitStatus=failed_after_mutation` |
| `client_id` changes between policy read and update | rejected, `mutated=false`, no status update, pending and cancelled audit entries appended |
| `visibility` changes between policy read and update | rejected, `mutated=false`, no status update, pending and cancelled audit entries appended |
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
node --test tests\validate-memory-cli.test.js
npm test
npm run gate:ci
npm run gate:mainline:strict
npm run validate-memory -- --json --memory-id dry-run-example --reason "manual review" --evidence "manual evidence" --actor-client-id codex --request-source cli
npm run lifecycle:sqlite:dry-run -- --json
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## P12.6 Internal CLI Wrapper

P12.6 adds a local CLI wrapper for the internal service:

```powershell
npm run validate-memory -- --json --memory-id <id> --reason <reason> --evidence <evidence> --actor-client-id <client> --request-source <source>
```

The wrapper is intentionally internal-only. It calls `services.validateMemoryService.validate(...)` and does not add a public MCP tool or change MCP schema.

Default behavior:

- `dryRun=true`
- `mutated=false`
- no lifecycle status update
- no audit append
- JSON output includes an `auditPreview` summary
- low-risk output sets `rawWorkspaceIdExposed=false`

Confirmed apply behavior:

- requires `--json`
- requires `--apply`
- requires `--confirm`
- still depends on `ValidateMemoryService` for `ToolArgumentValidator`, `SecretScanner`, lifecycle policy, scope policy, status checks, audit write ordering, and cross-client private mutation rejection
- appends pending audit intent before confirmed mutation
- appends committed audit after successful lifecycle update
- appends cancelled audit when lifecycle update fails after pending audit
- rejects if `client_id` or `visibility` no longer matches the policy snapshot at update time
- allows only `proposal/stale -> active`
- rejects `rejected/tombstoned/superseded -> active`

The CLI rejects asymmetric confirmation flags, missing required arguments, unknown `--tool` / `--mode` values, and attempts to pass raw `workspace_id` into the low-risk summary surface.

## Rollback Story

Code rollback:

- Revert the implementation commit if needed.
- Removing the internal service wiring restores the previous state because no public MCP tool depends on it.
- Removing the `validate-memory` npm script and `src/cli/validate-memory.js` removes the local wrapper without changing the internal service or public MCP contract.
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
- Review the internal CLI wrapper and decide whether it remains internal-only.
- Open a public MCP proposal review for `validate_memory`.

Public MCP expansion, schema changes, SQLite migration, or broader mutation tools remain separate approval gates.
