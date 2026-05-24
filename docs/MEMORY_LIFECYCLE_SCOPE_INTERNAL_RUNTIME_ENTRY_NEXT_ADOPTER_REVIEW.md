# Memory Lifecycle Scope Internal Runtime Entry Next Adopter Review

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_NEXT_ADOPTER_REVIEW_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record the next-adopter decision after CM-0874: now that the shared internal runtime-entry gate is a named core contract, determine which future governance family, if any, should adopt it next.

This slice is source read-only:

- no runtime mutation
- no public MCP expansion
- no readiness claim

## Current-State Supersession Note

This review is retained as historical decision trace for the CM-0875-era source reality.

It must not be used as the current shared-gate family truth. Current source and committed review evidence supersede this conclusion:

- `src/app.js` now exposes default-disabled internal runtime entries for `validate`, `tombstone`, and `supersede`
- `src/core/SupersedeMemoryService.js` now exists as the internal supersede mutation service
- `src/cli/supersede-memory.js` now exists as an internal dry-run-first CLI entry
- `docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_FAMILY_STABILIZATION_REVIEW.md` records the current family as `validate + tombstone + supersede`

The still-current part of this historical review is the boundary: none of this expands public MCP, proves live governance, closes recall/write reliability, or makes `memory_exclude` / `memory_forget` durable mutation adopters.

## Historical Reviewed Source Reality

Reviewed sources at the time:

- `src/core/DurableGovernanceMutationPacketContract.js`
- `src/storage/SqliteShadowStore.js`
- `src/core/ValidateMemoryService.js`
- `src/core/TombstoneMemoryService.js`
- existing CM-0863 / CM-0866 / CM-0868 / CM-0874 closeout docs

Historical bounded reality at the time:

- The packet contract recognizes five internal-only families:
  - `memory_validate`
  - `memory_supersede`
  - `memory_tombstone`
  - `memory_exclude`
  - `memory_forget`
- Runtime-entry adopters that actually have concrete service surfaces today:
  - `validate`
  - `tombstone`
- Bounded runtime-prep / projection support beyond those services:
  - tombstone runtime prep exists
  - supersede projection preview exists
  - no runtime-prep or service exists for `exclude`
  - no runtime-prep or service exists for `forget`

## Review Conclusion

The shared internal runtime-entry gate should remain `validate + tombstone` only for now.

Reason:

- `validate` and `tombstone` are both single-record lifecycle mutations with existing service, audit, and guarded lifecycle-update seams.
- `memory_supersede` is still a different class:
  - multi-record
  - bidirectional link semantics
  - replacement/current-state coupling
  - runtime candidate already documented as deferred behind extra projection/runtime-prep work
- `memory_exclude` and `memory_forget` are even less ready:
  - no runtime service
  - no runtime-prep helper
  - no bounded projection/apply seam in current source

## Exact Next Candidate

If a future governance family is reviewed for adoption beyond `validate + tombstone`, the next exact candidate should be:

- `memory_supersede` review/prep first

Not because it is ready now, but because it already has partial bounded projection semantics and is the nearest remaining runtime-facing family in current repository reality.

`memory_exclude` and `memory_forget` should remain deferred until they gain bounded runtime-prep and projection semantics of their own.

## Boundary

This review does not:

- add a new adopter to the shared gate
- add `validate_memory` to MCP
- add `memory_tombstone` to MCP
- add `memory_supersede` to MCP
- widen `callTool()`
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Historical Next Safe Step

The next smallest safe step is a bounded `memory_supersede` runtime-prep / candidate review slice that explicitly answers whether supersede can ever adopt the shared internal runtime-entry gate without violating current no-public-MCP and no-live-proof boundaries.
