# Memory Lifecycle Scope Internal Supersede CLI Entry

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_CLI_ENTRY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the smallest internal-only CLI/runtime-adjacent entry surface for the supersede-first governance path after `CM-0886`.

This slice stays internal:

- no public MCP tool
- no `callTool()` exposure
- no `TOOL_DEFINITIONS` change
- no readiness claim

## Implemented Source Reality

- New internal CLI:
  - `src/cli/supersede-memory.js`
- The CLI follows the same low-risk family shape used by `validate-memory` and `tombstone-memory`:
  - `--json`
  - `--apply`
  - `--confirm`
  - `--old-memory-id`
  - `--new-memory-id`
  - `--reason`
  - `--evidence`
  - `--supersedes-link`
  - `--superseded-by-link`
  - `--actor-client-id`
  - `--request-source`
  - `--tool`
  - `--mode`
  - `--workspace-id`
- The CLI is wired only to:
  - `createCodexMemoryApplication()`
  - `app.services.supersedeMemoryService.supersede(...)`
- The CLI keeps the same low-risk reporting boundary style:
  - `rawWorkspaceIdExposed=false`
  - sanitized audit preview/event summary only
  - no raw workspace value echoed back

## Tested CLI Reality

- `tests/supersede-memory-cli.test.js` now proves:
  - default dry-run returns `mutated=false`
  - `--apply` without `--confirm` fails closed
  - confirmed old/new pair can supersede in an isolated temp fixture DB
  - exact pair scope mismatch is rejected
  - cross-client private pair mutation is rejected
  - exact bidirectional link mismatch is rejected
  - missing supersede link projection support fails closed
  - raw `workspace_id` is rejected from low-risk CLI summary
  - public MCP tool names remain exactly:
    - `memory_overview`
    - `record_memory`
    - `search_memory`

## Validation

- `node --check src\cli\supersede-memory.js`
- `node --check tests\supersede-memory-cli.test.js`
- `node --test tests\supersede-memory-cli.test.js`

## Boundary

This slice does not:

- add `memory_supersede` to MCP
- change `src/core/constants.js`
- add `callTool('memory_supersede', ...)`
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Result

The supersede-first path now has four bounded internal layers:

- internal service
- temp-local evidence
- app service wiring
- internal CLI/runtime-adjacent entry

This is still not public/runtime durable governance apply.

## Next Safe Step

The next smallest safe step is a bounded review or implementation slice around whether this internal CLI should remain direct-path only, or whether a future default-disabled internal runtime entry should exist without expanding public MCP.
