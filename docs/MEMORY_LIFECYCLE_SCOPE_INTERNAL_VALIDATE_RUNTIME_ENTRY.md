# Memory Lifecycle Scope Internal Validate Runtime Entry

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_VALIDATE_RUNTIME_ENTRY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the smallest follow-up after CM-0872 that proves the default-disabled internal runtime-entry gate is reusable beyond tombstone.

This slice stays internal and bounded:

- no public MCP tool
- no `callTool()` exposure
- no `TOOL_DEFINITIONS` change
- no readiness claim

## Implemented Source Reality

- `src/app.js` now defines a shared internal runtime-entry helper:
  - `buildInternalRuntimeEntryPayload(...)`
- The shared helper now backs two internal app-level entry methods:
  - `app.executeInternalValidate(args, requestContext)`
  - `app.executeInternalTombstone(args, requestContext)`
- The new validate entry is default-disabled:
  - `internalValidateRuntimeEntryEnabled` defaults to `false`
- The validate entry is enabled only by internal construction:
  - `createCodexMemoryApplication({ internalValidateRuntimeEntryEnabled: true })`
- The validate entry also requires approved internal execution context:
  - `requestContext.executionContext.internalValidateRuntimeEntry === true`
  - `requestContext.executionContext.requestSource === 'internal-validate-runtime-entry'`
- When those gates pass, the entry routes into:
  - `app.services.validateMemoryService.validate(...)`
- The entry derives `actor_client_id` from internal execution context when the payload does not provide it.

## Tested Runtime Reality

- `tests/validate-memory-runtime-entry.test.js` now proves:
  - default-disabled entry rejects and preserves the current row
  - enabled entry still rejects without approved internal execution context
  - enabled + approved entry can validate a proposal record into `active`
  - `actor_client_id` can be derived from execution context
  - public MCP tool names remain unchanged
  - `app.callTool('validate_memory', ...)` still fails closed as unknown

## Validation

- `node --check src\app.js`
- `node --check tests\validate-memory-runtime-entry.test.js`
- `node --test tests\validate-memory-runtime-entry.test.js` -> `4/4`

## Boundary

This slice does not:

- add `validate_memory` to MCP
- change `src/core/constants.js`
- add `callTool('validate_memory', ...)`
- turn either internal runtime entry default-on
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Result

The internal governance runtime-entry family now has bounded reuse proof across two mutation families:

- `validate`
- `tombstone`

This means CM-0872 is no longer only a tombstone-only gate experiment.

It is still not public/runtime durable governance apply.

## Next Safe Step

The next smallest safe step is a bounded review or implementation slice around whether this shared internal runtime-entry family should remain validate+tombstone only, or whether future governance families should reuse the same gate shape without expanding public MCP.
