# Memory Lifecycle Scope Internal Supersede Runtime Entry

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_RUNTIME_ENTRY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the smallest default-disabled internal runtime-entry surface for the supersede-first governance path after `CM-0887`.

This slice stays internal:

- no public MCP tool
- no `callTool()` exposure
- no `TOOL_DEFINITIONS` change
- no readiness claim

## Implemented Source Reality

- Updated:
  - `src/app.js`
- Added:
  - `tests/supersede-memory-runtime-entry.test.js`
  - `docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_RUNTIME_ENTRY.md`
- `src/app.js` now exposes:
  - `app.executeInternalSupersede(args, requestContext)`
- The entry reuses the shared internal runtime-entry gate family:
  - `buildInternalRuntimeEntryPayload(...)`
  - default-disabled execution
  - approved internal execution-context enforcement
  - execution-context-derived `actor_client_id`
- Required runtime-entry payload fields are now normalized for:
  - `old_memory_id`
  - `new_memory_id`
  - `reason`
  - `evidence`
  - `supersedes_link`
  - `superseded_by_link`
- The entry routes only to:
  - `app.services.supersedeMemoryService.supersede(...)`

## Tested Runtime Reality

- `tests/supersede-memory-runtime-entry.test.js` now proves:
  - default-disabled rejection preserves both rows
  - missing approved execution context is rejected
  - enabled + approved context can apply one bounded pair mutation
  - execution context can supply `actor_client_id`
  - public MCP tool names remain exactly:
    - `memory_overview`
    - `record_memory`
    - `search_memory`
  - `app.callTool('memory_supersede', ...)` remains unknown

## Validation

- `node --check src\app.js`
- `node --check tests\supersede-memory-runtime-entry.test.js`
- `node --test tests\supersede-memory-runtime-entry.test.js`

## Boundary

This slice does not:

- add `memory_supersede` to MCP
- change `src/core/constants.js`
- widen public `callTool()`
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Result

The supersede-first path now has five bounded internal layers:

- internal service
- temp-local evidence
- app service wiring
- internal CLI/runtime-adjacent entry
- default-disabled internal runtime entry

This is still not public/runtime durable governance apply.

## Next Safe Step

The next smallest safe step is a bounded review for whether supersede should remain a direct internal path family, or whether the shared internal runtime-entry gate should now explicitly accept `validate + tombstone + supersede` as the bounded internal family set while still preserving no public MCP expansion.
