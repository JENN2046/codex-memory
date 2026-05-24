# Memory Lifecycle Scope Internal Supersede App Service Wiring

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_APP_SERVICE_WIRING_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the smallest safe `src/app.js` integration step for the internal-only supersede path after `CM-0885`.

This slice does not add a public MCP tool, does not change `TOOL_DEFINITIONS`, and does not claim runtime/public durable governance apply.

## Implemented Source Reality

- `src/app.js` now imports `SupersedeMemoryService`.
- `createCodexMemoryApplication()` now instantiates `supersedeMemoryService` with:
  - `config`
  - `shadowStore`
  - `auditLogStore`
- The service is now exposed only through `app.services.supersedeMemoryService`.
- `callTool()` remains unchanged:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- No `memory_supersede` public tool was added.
- No `src/core/constants.js` tool contract change was made.

## Test Reality

- `tests/phase-a-services.test.js` now verifies:
  - `app.services.supersedeMemoryService` exists
  - the surface exposes a callable `supersede(...)` function
  - a missing-pair dry-run style call stays internal and rejects cleanly
  - public MCP tool names remain exactly:
    - `memory_overview`
    - `record_memory`
    - `search_memory`

## Validation

- `node --check src\app.js`
- `node --check tests\phase-a-services.test.js`
- `node --test tests\phase-a-services.test.js`

## Boundary

This slice is intentionally narrow.

It does not:

- expose `memory_supersede` through MCP
- change `TOOL_DEFINITIONS`
- add CLI/runtime public wiring
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Result

The supersede-first path is now no longer only:

- internal service construction in isolated tests, or
- temp-local evidence outside the app surface

It also has bounded app-level internal wiring through `app.services`, while preserving the public MCP freeze.

## Next Safe Step

The next smallest safe step is a bounded review or implementation slice around whether supersede should:

- remain `app.services`-only for now, or
- later adopt a default-disabled internal runtime-entry surface without public MCP expansion.
