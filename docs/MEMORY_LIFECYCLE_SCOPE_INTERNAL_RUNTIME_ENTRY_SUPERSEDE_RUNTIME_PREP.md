# MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_RUNTIME_PREP

Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_RUNTIME_PREP_COMPLETED_NOT_READY`

## Purpose

`CM-0990` takes the next smallest safe step after `CM-0988` and `CM-0989`.

`CM-0988` already turned supersede pair-outcome semantics into a reusable blocked helper, and `CM-0989` fixed the fixture-only shadow-seam contract prerequisite.

What still remained too abstract was the future pair-shaped runtime plan:

- what exact runtime surface must exist
- what exact pair update plan future seam work would need to consume
- what exact audit and rollback preview shape must stay bound to the pair

This slice still does not implement runtime apply.

It only turns the blocked supersede chain into a reusable blocked runtime-prep helper.

## Implemented Surface

Added:

- [MemorySupersedeRuntimePrepHelper.js](/A:/codex-memory/src/core/MemorySupersedeRuntimePrepHelper.js)
- [memory-supersede-runtime-prep-request-v1.json](/A:/codex-memory/tests/fixtures/memory-supersede-runtime-prep-request-v1.json)
- [memory-supersede-runtime-prep-helper.test.js](/A:/codex-memory/tests/memory-supersede-runtime-prep-helper.test.js)

The helper now consumes:

- the `CM-0987` pair-outcome contract
- the `CM-0989` two-record seam contract
- the `CM-0862` blocked dry-run packet/input shape
- the `CM-0863` projection preview surface
- one explicit runtime capability record

and emits one coherent internal-only supersede runtime-prep preview.

## What The Helper Fixes

The helper now makes the future supersede apply side concrete:

- one exact pair runtime candidate family: `memory_supersede`
- one exact pair update API candidate: `applySupersedePair`
- one exact pair link-column set:
  - `supersedes_memory_id`
  - `superseded_by_memory_id`
- one exact pair update plan over old/new records
- one exact `pending / committed / cancelled` audit plan
- one exact rollback-preview requirement
- one exact runtime-surface blocker list when pair seams are missing

That means later work no longer has to re-decide:

- whether supersede runtime-prep is pair-shaped
- whether single-record reuse is allowed
- whether rollback preview is required
- whether pair atomicity and shared policy guard must be explicit blockers

## Validation

Targeted validation:

- `node --check src\core\MemorySupersedeRuntimePrepHelper.js`
- `node --check tests\memory-supersede-runtime-prep-helper.test.js`
- `node --test tests\memory-supersede-runtime-prep-helper.test.js`
- public MCP freeze scan over app/adapters
- readiness/no-overclaim scan over the scoped packet

Docs/board validation:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Boundaries

This slice does not:

- implement the guarded two-record supersede seam
- implement a durable audit writer
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

1. a bounded guarded two-record supersede seam discussion or implementation candidate
2. only after that, any internal supersede service wiring discussion
3. only after that, any shared-gate adoption discussion
