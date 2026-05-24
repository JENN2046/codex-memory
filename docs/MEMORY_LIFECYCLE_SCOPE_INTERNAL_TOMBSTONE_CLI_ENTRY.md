# Memory Lifecycle Scope Internal Tombstone CLI Entry

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_TOMBSTONE_CLI_ENTRY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the smallest internal-only CLI/runtime-adjacent entry surface for the tombstone-first governance path after CM-0870.

This slice stays internal:

- no public MCP tool
- no `callTool()` exposure
- no `TOOL_DEFINITIONS` change
- no readiness claim

## Implemented Source Reality

- New internal CLI:
  - `src/cli/tombstone-memory.js`
- The CLI follows the existing `validate-memory` shape:
  - `--json`
  - `--apply`
  - `--confirm`
  - `--memory-id`
  - `--reason`
  - `--evidence`
  - `--tombstone-reason`
  - `--actor-client-id`
  - `--request-source`
  - `--tool`
  - `--mode`
  - `--workspace-id`
- The CLI is wired only to:
  - `createCodexMemoryApplication()`
  - `app.services.tombstoneMemoryService.tombstone(...)`
- The CLI keeps the same low-risk reporting boundary style:
  - `rawWorkspaceIdExposed=false`
  - sanitized audit preview/event summary only
  - no raw workspace value echoed back

## Tested CLI Reality

- `tests/tombstone-memory-cli.test.js` now proves:
  - default dry-run returns `mutated=false`
  - `--apply` without `--confirm` fails closed
  - confirmed active record can tombstone in an isolated temp fixture DB
  - forbidden lifecycle states are rejected
  - secret-like `tombstone-reason` is rejected without leaking the raw token
  - missing `tombstone_reason` lifecycle projection support fails closed
  - raw `workspace_id` is rejected from low-risk CLI summary
  - public MCP tool names remain exactly:
    - `memory_overview`
    - `record_memory`
    - `search_memory`

## Validation

- `node --check src\cli\tombstone-memory.js`
- `node --check tests\tombstone-memory-cli.test.js`
- `node --test tests\tombstone-memory-cli.test.js` -> `8/8`

## Boundary

This slice does not:

- add `memory_tombstone` to MCP
- change `src/core/constants.js`
- add `callTool('memory_tombstone', ...)`
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Result

The tombstone-first path now has three bounded internal layers:

- internal service
- app service wiring
- internal CLI/runtime-adjacent entry

This is still not public/runtime durable governance apply.

## Next Safe Step

The next smallest safe step is a bounded review or implementation slice around whether this internal CLI should remain direct-path only, or whether a future default-disabled internal runtime entry should exist without expanding public MCP.
