# MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_PAIR_OUTCOME_HELPER

Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_PAIR_OUTCOME_HELPER_COMPLETED_NOT_READY`

## Purpose

`CM-0988` takes the next smallest safe step after `CM-0987`.

`CM-0987` already fixed the future supersede pair-outcome contract:

- exact pair-outcome fields
- exact event phases
- shared `pairCorrelationId`
- `singleRecordAuditReuseAllowed=false`

What still remained too abstract was the concrete preview surface that future supersede runtime-prep or service work would need to consume.

This slice does not implement runtime apply.

It only turns that contract into a reusable blocked helper that can preview:

- one pair-outcome object
- one `pending` audit event preview
- one `committed` audit event preview
- one `cancelled` audit event preview

## Implemented Surface

Added:

- [MemorySupersedePairOutcomeHelper.js](/A:/codex-memory/src/core/MemorySupersedePairOutcomeHelper.js)
- [memory-supersede-pair-outcome-helper-request-v1.json](/A:/codex-memory/tests/fixtures/memory-supersede-pair-outcome-helper-request-v1.json)
- [memory-supersede-pair-outcome-helper.test.js](/A:/codex-memory/tests/memory-supersede-pair-outcome-helper.test.js)

The helper now consumes:

- the `CM-0987` pair-outcome contract
- the `CM-0861/CM-0862` blocked dry-run packet/input shape
- the `CM-0863` fixture-backed projection preview surface

and emits one coherent internal-only supersede pair-outcome preview.

## What The Helper Fixes

The helper now makes the future supersede audit side concrete:

- old/new pair ids stay bound together
- one shared `pairCorrelationId` is derived deterministically
- three event ids are previewed:
  - `intentEventId`
  - `committedEventId`
  - `cancelledEventId`
- dual previous-snapshot refs are preserved
- dual lifecycle transitions are preserved
- bidirectional link fields are preserved
- projected changed-memory ids and projected revision token are carried forward from bounded projection preview

That means later work no longer has to re-decide:

- whether supersede should have one shared pair correlation id
- whether old/new snapshot refs are both required
- whether one side can silently skip committed/cancelled follow-up

## Validation

Targeted validation:

- `node --check src\core\MemorySupersedePairOutcomeHelper.js`
- `node --check tests\memory-supersede-pair-outcome-helper.test.js`
- `node --test tests\memory-supersede-pair-outcome-helper.test.js`
- public MCP freeze scan over app/adapters
- readiness/no-overclaim scan over the scoped packet

Docs/board validation:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Boundaries

This slice does not:

- implement a durable audit writer
- implement the guarded two-record supersede seam
- implement a supersede runtime-prep helper
- implement an internal supersede service
- add a third adopter to the shared internal runtime-entry gate
- expand public MCP
- widen public `callTool()`
- execute true live memory action
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

Project state remains `RC_NOT_READY_BLOCKED`.

## Next

The next smallest safe step should now be:

1. a bounded supersede runtime-prep helper
2. only after that, a guarded two-record seam discussion
3. only after that, any service wiring or shared-gate adoption discussion
