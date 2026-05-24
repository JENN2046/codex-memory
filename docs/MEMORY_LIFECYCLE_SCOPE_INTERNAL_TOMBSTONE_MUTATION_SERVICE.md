# Memory Lifecycle Scope Internal Tombstone Mutation Service

Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_TOMBSTONE_MUTATION_SERVICE_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0868`

## Purpose

CM-0867 closed the exact writable `tombstone_reason` storage seam.

This slice adds the smallest internal tombstone mutation service above that seam without widening into public MCP exposure or broader runtime durable governance apply.

## What Changed

Added:

- [TombstoneMemoryService.js](/A:/codex-memory/src/core/TombstoneMemoryService.js)
- [tombstone-memory-runtime.test.js](/A:/codex-memory/tests/tombstone-memory-runtime.test.js)

`TombstoneMemoryService` intentionally stays internal-only.

It follows the existing `ValidateMemoryService` execution pattern:

- exact schema validation
- secret-like content rejection
- lifecycle eligibility check
- cross-client private-scope guard
- default `dry_run=true`
- `confirm=true` required when `dry_run=false`
- pending audit intent before lifecycle mutation
- guarded single-record `updateLifecycleStatus(...)`
- committed / cancelled audit follow-up

Current accepted lifecycle transition set is intentionally narrow:

- `active -> tombstoned`
- `stale -> tombstoned`
- `superseded -> tombstoned`

The service also fails closed when:

- the memory does not exist
- lifecycle status support is missing
- `tombstone_reason` projection support is missing
- the current status is outside the allowed set
- the private record belongs to a different client
- pending audit append fails
- the guarded lifecycle update no longer matches current policy state

## Why This Matters

Before CM-0868, the tombstone-first governance path had:

- packet contract
- dry-run contract preview
- projection preview
- runtime-prep helper
- writable `tombstone_reason` storage seam

But it still lacked the smallest real runtime mutation service that could connect:

- validated internal input
- tombstone lifecycle eligibility
- append-only audit intent
- guarded single-record lifecycle mutation
- committed / cancelled audit follow-up

After CM-0868, that service shape now exists locally as a bounded internal runtime slice.

This is still not public runtime durable governance apply.

## Validation

Validated:

- `node --check src\core\TombstoneMemoryService.js`
- `node --check tests\tombstone-memory-runtime.test.js`
- `node --test tests\tombstone-memory-runtime.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Targeted runtime coverage passed `14/14`, including:

- dry-run default no-mutation behavior
- pending audit before mutation
- committed and cancelled audit follow-up
- secret-like input rejection without secret echo
- private cross-client guard
- lifecycle-status allow/deny matrix
- `tombstone_reason` projection support requirement
- public MCP contract freeze

## Boundaries Preserved

CM-0868 does not:

- expose `memory_tombstone` as a public MCP tool
- wire the new service into `src/app.js`
- execute true live `record_memory` or `search_memory`
- read raw real memory content or direct real `.jsonl`
- call providers
- claim runtime durable governance apply is ready
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC_READY`
- claim production readiness

## Next Safe Step

After CM-0868, the most aligned next small step is:

1. a bounded runtime-integration review for whether this internal service should remain helper-only or become default-disabled wiring; or
2. a bounded temp-local/runtime-adjacent tombstone proof that consumes the new service without widening into public MCP or live governance proof.

`memory_supersede` runtime apply should still remain deferred.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_INTERNAL_TOMBSTONE_MUTATION_SERVICE_COMPLETED_NOT_READY`

The tombstone-first governance path now has a bounded internal mutation service with schema/secret/lifecycle/scope/audit/update guards, but it remains internal-only evidence rather than readiness or public durable governance apply.
