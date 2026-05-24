# MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_PAIR_OUTCOME_CONTRACT

Status: `COMPLETED_VALIDATED_LOCAL_COMMIT_NOT_READY`
Current commit task: `CM-0987`
Original candidate lineage: `CM-0879`

## Purpose

`CM-0879` takes the next smallest safe step after `CM-0878`.

`CM-0878` already fixed the future supersede storage seam shape:

- two-record only
- shared policy guard
- bidirectional links
- shared correlation id
- atomic pair outcome required

What still remained too loose was the future audit follow-up shape around that seam.

This slice does not implement audit writing.

It only turns the next audit-side requirement into a reusable blocked contract helper.

## Implemented Surface

Added:

- [MemorySupersedePairOutcomeContract.js](/A:/codex-memory/src/core/MemorySupersedePairOutcomeContract.js)
- [memory-supersede-pair-outcome-v1.json](/A:/codex-memory/tests/fixtures/memory-supersede-pair-outcome-v1.json)
- [memory-supersede-pair-outcome-contract.test.js](/A:/codex-memory/tests/memory-supersede-pair-outcome-contract.test.js)

The new contract helper locks the minimum future pair-outcome / audit-correlation shape for `memory_supersede`:

- exact pair ids: `oldMemoryId`, `newMemoryId`
- exact event ids:
  - `intentEventId`
  - `committedEventId`
  - `cancelledEventId`
- one shared `pairCorrelationId`
- dual previous-snapshot refs:
  - `oldPreviousSnapshotRef`
  - `newPreviousSnapshotRef`
- dual lifecycle transitions:
  - `oldFromStatus -> oldToStatus`
  - `newFromStatus -> newToStatus`
- bidirectional link fields:
  - `supersededByLink`
  - `supersedesLink`
- shared actor / request / reason / evidence / time fields

It also locks the key blocked properties:

- pair intent required
- pair committed follow-up required
- pair cancelled follow-up required
- shared correlation id required
- dual previous-snapshot refs required
- dual lifecycle transitions required
- bidirectional link fields required
- pair atomicity required
- `singleRecordAuditReuseAllowed=false`

## Why This Matters

Without this step, a later supersede implementation could still drift into a weaker audit model:

- two unrelated single-record audit writes
- no shared pair correlation id
- missing one side's previous snapshot
- committed/cancelled follow-up only for one side

`CM-0879` makes that future downgrade harder by fixing the contract before any runtime helper or service exists.

## Validation

Targeted validation:

- `node --check src\core\MemorySupersedePairOutcomeContract.js`
- `node --check tests\memory-supersede-pair-outcome-contract.test.js`
- `node --test tests\memory-supersede-pair-outcome-contract.test.js`

CM-0987 reran this narrow gate before local commit consideration.

Docs/board validation:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Boundaries

This slice does not:

- implement a supersede pair-outcome helper
- implement an audit writer
- implement the two-record shadow seam
- add a supersede runtime-prep helper
- add an internal supersede service
- add a third adopter to the shared internal runtime-entry gate
- expand public MCP
- widen public `callTool()`
- execute true live memory action
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

Project state remains `RC_NOT_READY_BLOCKED`.

## Next

The next smallest safe step is no longer vague.

It should be one of these, in order:

1. a bounded internal `memory_supersede` pair-outcome / audit-correlation helper
2. only after that, a bounded supersede runtime-prep helper
3. only after that, any discussion of a real two-record seam implementation or service wiring
