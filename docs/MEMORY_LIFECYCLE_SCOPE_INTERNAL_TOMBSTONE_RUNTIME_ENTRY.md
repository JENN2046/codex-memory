# Memory Lifecycle Scope Internal Tombstone Runtime Entry

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_TOMBSTONE_RUNTIME_ENTRY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the smallest default-disabled internal runtime-entry surface for the tombstone-first governance path after CM-0871.

This slice stays internal and bounded:

- no public MCP tool
- no `callTool()` exposure
- no `TOOL_DEFINITIONS` change
- no readiness claim

## Implemented Source Reality

- `src/app.js` now defines a bounded internal runtime-entry method:
  - `app.executeInternalTombstone(args, requestContext)`
- The entry is default-disabled:
  - `internalTombstoneRuntimeEntryEnabled` defaults to `false`
- The entry is enabled only by internal construction:
  - `createCodexMemoryApplication({ internalTombstoneRuntimeEntryEnabled: true })`
- The entry also requires approved internal execution context:
  - `requestContext.executionContext.internalTombstoneRuntimeEntry === true`
  - `requestContext.executionContext.requestSource === 'internal-tombstone-runtime-entry'`
- When those gates pass, the entry routes into:
  - `app.services.tombstoneMemoryService.tombstone(...)`
- The entry derives `actor_client_id` from internal execution context when the payload does not provide it.

## Tested Runtime Reality

- `tests/tombstone-memory-runtime-entry.test.js` now proves:
  - default-disabled entry rejects and preserves the current row
  - enabled entry still rejects without approved internal execution context
  - enabled + approved entry can tombstone an active record
  - `actor_client_id` can be derived from execution context
  - public MCP tool names remain unchanged
  - `app.callTool('memory_tombstone', ...)` still fails closed as unknown

## Validation

- `node --check src\app.js`
- `node --check tests\tombstone-memory-runtime-entry.test.js`
- `node --test tests\tombstone-memory-runtime-entry.test.js` -> `4/4`

## Boundary

This slice does not:

- add `memory_tombstone` to MCP
- change `src/core/constants.js`
- add `callTool('memory_tombstone', ...)`
- turn the entry default-on
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Result

The tombstone-first path now has four bounded internal layers:

- internal service
- app service wiring
- internal CLI entry
- default-disabled internal runtime entry

This is still not public/runtime durable governance apply.

## Next Safe Step

The next smallest safe step is a bounded review or implementation slice around whether this default-disabled internal runtime entry should remain tombstone-only, or whether future governance families should reuse the same gate shape without expanding public MCP.
