# MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_SHADOW_STORE_SEAM_IMPLEMENTATION_CANDIDATE

Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_SHADOW_STORE_SEAM_IMPLEMENTATION_CANDIDATE_COMPLETED_NOT_READY`

## Purpose

`CM-0883` takes the next smallest safe step after `CM-0882`.

`CM-0882` already turned the future supersede seam into one explicit blocked candidate helper.

What still remained unimplemented was the exact shadow-store pair seam itself:

- one transactional old/new pair update
- one fail-closed rollback when the second record guard fails
- one internal-only storage surface future service work can actually call

This slice still does not add an internal supersede service.

It only implements the bounded guarded two-record shadow-store seam candidate that future service work would need to consume.

## Implemented Surface

Updated:

- [SqliteShadowStore.js](/A:/codex-memory/src/storage/SqliteShadowStore.js)
- [validate-memory-runtime.test.js](/A:/codex-memory/tests/validate-memory-runtime.test.js)

The store now exposes one internal pair-shaped method:

- `applySupersedePair(...)`

The method now:

- requires two distinct record ids
- requires lifecycle status and policy-guard columns
- requires supersede link columns
- updates old/new records inside one transaction
- writes bidirectional supersede links
- writes shared lifecycle metadata
- rolls back if either guarded row update fails

## What This Fixes

The repository no longer only has:

- prose review
- seam contract
- pair-outcome helper
- runtime-prep helper
- seam-candidate helper

It now also has one actual internal storage seam candidate that can be tested against isolated SQLite state.

That means later work no longer has to speculate about:

- whether pair apply can be atomic in the current storage layer
- whether second-record guard failure leaves half-applied state behind
- whether bidirectional link writes belong in the same bounded storage method

## Validation

Targeted validation:

- `node --check src\storage\SqliteShadowStore.js`
- `node --check tests\validate-memory-runtime.test.js`
- `node --test tests\validate-memory-runtime.test.js`

Docs/board validation:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Boundaries

This slice does not:

- add an internal supersede service
- append supersede audit events at runtime
- adopt the shared internal runtime-entry gate
- expand public MCP
- widen public `callTool()`
- execute true live memory action
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

Project state remains `RC_NOT_READY_BLOCKED`.

## Next

The next smallest safe step should now be:

1. a bounded internal supersede mutation service slice that consumes `applySupersedePair(...)`
2. only after that, any shared-gate adoption discussion
3. only after that, any public/runtime governance entry discussion
