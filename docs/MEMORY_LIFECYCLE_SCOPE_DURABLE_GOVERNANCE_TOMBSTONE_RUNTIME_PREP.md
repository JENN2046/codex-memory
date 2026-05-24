# Memory Lifecycle Scope Durable Governance Tombstone Runtime Prep

Status: `MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_TOMBSTONE_RUNTIME_PREP_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0866`

## Purpose

CM-0864 fixed the next runtime direction:

- internal-only;
- tombstone-first;
- single-record before supersede.

CM-0865 then narrowed the field-name gap between:

- logical projection preview fields,
- and SQLite lifecycle column vocabulary.

What still remained missing was a concrete internal runtime-prep shape that could say:

- what a tombstone-first apply path would actually need to do;
- how closely it matches `ValidateMemoryService`;
- and which exact current seam is still missing before any bounded runtime proof is worth attempting.

CM-0866 closes that gap with a pure internal, explicit-input, zero-side-effect helper.

## What Changed

Added:

- [DurableGovernanceTombstoneRuntimePrepHelper.js](/A:/codex-memory/src/core/DurableGovernanceTombstoneRuntimePrepHelper.js)
- [durable-governance-tombstone-runtime-prep-helper.test.js](/A:/codex-memory/tests/durable-governance-tombstone-runtime-prep-helper.test.js)

The helper consumes:

- one CM-0861 style mutation packet candidate;
- one CM-0863/CM-0865 compatible projection-record set;
- one explicit runtime-surface capability record.

It then returns a fail-closed tombstone-first internal apply plan that is still blocked from execution.

## Runtime-Prep Shape

The helper now translates the bounded evidence stack into one runtime-adjacent plan with:

### 1. Dry-run and projection acceptance checks

It requires:

- CM-0862 dry-run preview acceptance;
- CM-0863/CM-0865 tombstone projection preview acceptance;
- supported family = `memory_tombstone`.

### 2. `ValidateMemoryService`-style audit plan

It emits explicit preview events for:

- pending audit intent;
- committed audit;
- cancelled audit.

This keeps the same mental model as `ValidateMemoryService`:

- audit before mutation;
- guarded shadow update;
- committed or cancelled audit follow-up.

### 3. Single-record shadow update plan

It emits an `updateLifecycleStatus` candidate plan with:

- `memoryId`
- `fromStatus`
- `toStatus`
- `updatedAt`
- `actorClientId`
- `reason`
- `expectedClientId`
- `expectedVisibility`

It also carries the converged SQLite projection view:

- `status`
- `status_reason`
- `tombstone_reason`
- `lifecycle_updated_at`
- `lifecycle_actor_client_id`

### 4. Invalidation plan

It carries forward:

- `changedMemoryIds`
- projected revision token

So the helper now bridges:

- packet contract,
- dry-run preview,
- projection preview,
- future recall invalidation.

## Most Important Result

CM-0866 makes the runtime-prep blocker shape much narrower and more concrete.

Under an explicit incomplete capability input, the helper fails closed because:

- `tombstone_reason` is part of the required projected SQLite state,
- but that supplied runtime surface does not expose a writable `tombstone_reason` projection capability.

So the blocker is no longer vague “future runtime wiring” when this capability is absent.

When absent, it is a much smaller, exact seam:

- bounded internal tombstone-reason projection support in the single-record lifecycle update path.

Current repository reality has since added the single-record `tombstone_reason` lifecycle seam. With a complete explicit runtime capability record, this helper now produces a coherent tombstone-first internal apply plan while still keeping execution blocked.

## Why This Is Useful

Before CM-0866, the project had:

- design direction;
- packet contract;
- dry-run preview;
- projection preview;
- runtime candidate review.

But it still lacked one artifact that translated all of that into a concrete runtime-adjacent apply shape.

CM-0866 now provides that shape without:

- executing mutation;
- touching SQLite;
- writing audit;
- expanding public MCP.

That makes the next implementation step much easier to choose and verify.

## Validation

Validated:

- `node --check src\core\DurableGovernanceTombstoneRuntimePrepHelper.js`
- `node --check tests\durable-governance-tombstone-runtime-prep-helper.test.js`
- `node --test tests\durable-governance-tombstone-runtime-prep-helper.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Targeted coverage proves:

- missing tombstone-reason runtime capability fails closed;
- a fully-capable explicit runtime surface would produce a coherent tombstone-first internal apply plan;
- unsupported families remain blocked;
- sensitive fields remain redacted.

## Boundaries Preserved

CM-0866 does not:

- execute durable governance mutation;
- append durable audit intent or commit records;
- apply SQLite lifecycle mutation;
- expose new public MCP tools;
- call providers;
- execute true live `record_memory` or `search_memory`;
- read real memory content or direct real `.jsonl`;
- prove runtime apply;
- prove `memory write reliable`;
- prove `memory recall reliable`;
- prove `RC_READY`;
- prove production readiness.

## Next Safe Step

After CM-0866, the most aligned next small step is no longer abstract.

It is one of:

1. a bounded internal shadow-update seam review/patch that introduces tombstone-reason projection support in the single-record lifecycle path;
2. only after that, a bounded temp-local or internal runtime proof for tombstone apply.

`memory_supersede` runtime apply should still remain deferred.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_TOMBSTONE_RUNTIME_PREP_COMPLETED_NOT_READY`

The durable governance stack now includes a tombstone-first internal runtime-prep helper that translates packet, dry-run, and projection evidence into a concrete apply-plan shape. It still fail-closes when writable `tombstone_reason` projection capability is absent, and it can produce a coherent no-side-effect internal plan when that capability is explicitly present.
