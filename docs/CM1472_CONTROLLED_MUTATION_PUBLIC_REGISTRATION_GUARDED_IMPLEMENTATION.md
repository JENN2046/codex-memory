# CM-1472 Controlled Mutation Public Registration Guarded Implementation

## Decision

`APPROVED_CONTROLLED_MUTATION_PUBLIC_REGISTRATION` was applied to public MCP registration for exactly:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This task registers only bounded controlled-mutation preflight tools. It does not authorize public confirmed mutation execution.

## Implemented Surface

Public MCP `TOOL_DEFINITIONS` now expose exactly:

- `record_memory`
- `search_memory`
- `memory_overview`
- `audit_memory`
- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

`app.callTool(...)` dispatches the three controlled mutation tools to existing internal services through a public low-disclosure wrapper:

- `validate_memory` -> `ValidateMemoryService.validate(...)`
- `tombstone_memory` -> `TombstoneMemoryService.tombstone(...)`
- `supersede_memory` -> `SupersedeMemoryService.supersede(...)`

The public wrapper forces the public path to dry-run bounded behavior and rejects confirmed mutation attempts.

## Public Confirm Gate

The public MCP path rejects:

- `dry_run=false`
- `confirm=true`

The rejection states that confirmed controlled mutation requires separate exact mutation approval. This keeps public registration separate from durable apply authority.

## Low-Disclosure Projection

Public controlled mutation outputs are projected through a bounded result shape.

The projection records:

- access mode
- requested tool name
- dry-run status
- mutation status
- approval requirement
- selected summary fields
- policy flags

The projection does not return:

- raw memory content
- raw audit content
- filesystem paths
- token material
- provider payload
- `memoryId`
- title
- content
- snippet
- raw text

## Validation

Validation run for this task:

```powershell
node --test tests\controlled-mutation-public-registration.test.js tests\controlled-mutation-public-contract-preflight.test.js tests\audit-memory-public-contract-preflight.test.js tests\audit-memory-readonly-tool-draft.test.js tests\validate-memory-runtime.test.js tests\tombstone-memory-runtime.test.js tests\supersede-memory-runtime.test.js tests\validate-memory-runtime-entry.test.js tests\tombstone-memory-runtime-entry.test.js tests\supersede-memory-runtime-entry.test.js tests\mcp-contract.test.js tests\mcp-http.test.js
npm test
npm run test:hardening
npm run gate:mainline:strict
```

Observed results:

- targeted public registration and related MCP/runtime tests passed
- `npm test` passed `3046/3046`
- `npm run test:hardening` passed `84/84` across hardening and CI override evidence checks
- `npm run gate:mainline:strict` passed health, contract `36/36`, test `3046/3046`, compare `43/43`, and rollback `43/43`

Final whitespace/docs validation is recorded in `CMV-1578`.

## Boundaries

No real mutation was executed by this task.

This task did not:

- execute confirmed `validate_memory`
- execute confirmed `tombstone_memory`
- execute confirmed `supersede_memory`
- scan raw memory rows
- scan raw audit
- dump raw JSONL
- call provider/API
- use bearer token
- claim readiness
- claim `RC_READY`
- release, tag, or deploy
- push

## Status

`COMPLETED_VALIDATED_CONTROLLED_MUTATION_PUBLIC_REGISTRATION_DRY_RUN_GATED_NO_REAL_MUTATION`

Project status remains:

```text
NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```
