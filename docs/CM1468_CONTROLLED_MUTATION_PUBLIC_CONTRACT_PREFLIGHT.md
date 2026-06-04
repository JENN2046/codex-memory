# CM-1468 Controlled Mutation Public Contract Preflight

Date: 2026-06-04

## Scope

CM-1468 prepares a public contract preflight for future controlled mutation tools:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This task does not register those tools as public MCP tools.

This task does not execute real mutation.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Source/Test Changes

Added:

```text
src/core/ControlledMutationPublicContractPreflight.js
tests/controlled-mutation-public-contract-preflight.test.js
```

The preflight report documents:

- candidate tool names
- bounded input schemas
- low-disclosure output projection
- required approval gates before public registration
- forbidden public behavior
- current public MCP freeze state

## Public MCP Boundary

Current public tools remain:

```text
record_memory
search_memory
memory_overview
audit_memory
```

CM-1468 tests verify:

- `validate_memory`, `tombstone_memory`, and `supersede_memory` are not in `TOOL_DEFINITIONS`
- `tools/list` does not expose them
- `app.callTool(...)` rejects them as unknown tools
- preflight side-effect flags are false

## Low-Disclosure Contract

The preflight output forbids:

- raw memory return
- raw audit return
- raw JSONL return
- filesystem path return
- token material return
- provider payload return
- memory content return
- readiness or `RC_READY` claim

Allowed output is limited to bounded planning fields such as:

- `accepted`
- `decision`
- `toolCandidate`
- `dryRun`
- `mutated`
- `fromStatus`
- `toStatus`
- `reasonCode`
- `policy`
- `approvalRequired`

## Boundary Receipt

CM-1468 did not expand public MCP tools.

CM-1468 did not execute real mutation.

CM-1468 did not perform raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push.

## Follow-Up

Future public registration of controlled mutation tools remains exact-approval / Red-boundary work and must include fresh public MCP registration tests, tool-call schema tests, low-disclosure projection tests, confirm-path approval tests, and readiness-claim exclusion tests.
