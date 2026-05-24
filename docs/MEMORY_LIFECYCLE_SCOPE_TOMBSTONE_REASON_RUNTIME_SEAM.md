# Memory Lifecycle Scope Tombstone Reason Runtime Seam

Status: `MEMORY_LIFECYCLE_SCOPE_TOMBSTONE_REASON_RUNTIME_SEAM_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0867`

## Purpose

CM-0866 narrowed the next governance runtime blocker to one exact seam:

- writable `tombstone_reason` projection support
- in the existing single-record lifecycle update path

This slice closes that exact seam without widening into runtime durable governance apply.

## What Changed

Updated:

- [SqliteShadowStore.js](/A:/codex-memory/src/storage/SqliteShadowStore.js)
- [validate-memory-runtime.test.js](/A:/codex-memory/tests/validate-memory-runtime.test.js)

`SqliteShadowStore.updateLifecycleStatus()` now accepts:

- `tombstoneReason`

and persists it into:

- `tombstone_reason`

when that lifecycle column exists.

The existing single-record lifecycle seam still preserves:

- required `memory_id` + `from_status`
- exact `client_id` / `visibility` policy guards
- `status`
- `updated_at`
- optional `lifecycle_updated_at`
- optional `lifecycle_actor_client_id`
- optional `status_reason`

So the change is additive and bounded:

- no public tool contract change
- no new service surface
- no runtime durable governance apply

## Why This Matters

Before CM-0867, the CM-0866 runtime-prep helper could already show a coherent tombstone-first internal apply plan, but current-source-like runtime capabilities still failed closed on:

- `tombstone_reason_projection_surface_missing`

After CM-0867, that exact single-record projection seam now exists in the storage layer.

This means the smallest remaining runtime blocker is no longer:

- missing writable `tombstone_reason` support

It is now closer to:

- missing internal tombstone mutation service wiring that would connect
  - packet / dry-run acceptance
  - pending audit intent
  - guarded single-record lifecycle update
  - committed / cancelled audit follow-up

## Validation

Validated:

- `node --check src\storage\SqliteShadowStore.js`
- `node --check tests\validate-memory-runtime.test.js`
- `node --test tests\validate-memory-runtime.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Targeted runtime coverage now proves:

- the single-record lifecycle seam can write `tombstone_reason`
- `status_reason` and lifecycle timestamps still behave normally
- existing `validate_memory` runtime behavior remains green

## Boundaries Preserved

CM-0867 does not:

- execute durable governance mutation
- append durable governance audit events
- add a tombstone runtime service
- expose new public MCP tools
- call providers
- execute true live `record_memory` or `search_memory`
- read real memory content or direct real `.jsonl`
- prove runtime durable governance apply
- prove `memory write reliable`
- prove `memory recall reliable`
- prove `RC_READY`
- prove production readiness

## Next Safe Step

After CM-0867, the most aligned next small step is:

1. a bounded internal tombstone mutation service slice that follows the `ValidateMemoryService` execution pattern; or
2. a bounded temp-local/runtime-adjacent proof that consumes the now-complete single-record lifecycle projection seam.

`memory_supersede` runtime apply should still remain deferred.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_TOMBSTONE_REASON_RUNTIME_SEAM_COMPLETED_NOT_READY`

The existing single-record lifecycle update seam now supports writable `tombstone_reason`, so the next governance runtime blocker has moved forward from missing storage projection support to missing internal tombstone-service wiring.
