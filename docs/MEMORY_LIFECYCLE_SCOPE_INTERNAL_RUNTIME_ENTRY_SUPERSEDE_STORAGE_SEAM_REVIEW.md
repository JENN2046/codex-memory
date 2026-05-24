# Memory Lifecycle Scope Internal Runtime Entry Supersede Storage Seam Review

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_STORAGE_SEAM_REVIEW_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Take the next exact step after `CM-0876`.

Question:

- if `memory_supersede` ever becomes the third adopter of the shared internal runtime-entry gate,
- what storage seam should exist first.

This slice is source read-only:

- no runtime mutation
- no public MCP expansion
- no readiness claim

## Current-State Supersession Note

This review is retained as historical decision trace for the CM-0877-era source reality.

It must not be used as current evidence that the supersede two-record seam, service, CLI, or internal runtime entry are absent. Current source and committed review evidence supersede that old blocker framing:

- `src/storage/SqliteShadowStore.js` now includes the guarded supersede pair path used by current internal supersede service tests
- `src/core/SupersedeMemoryService.js` now exists above that seam
- `src/cli/supersede-memory.js` exists as an internal dry-run-first CLI entry
- `src/app.js` exposes a default-disabled `app.executeInternalSupersede(...)` entry
- `docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_FAMILY_STABILIZATION_REVIEW.md` records the current shared-gate family as `validate + tombstone + supersede`

The still-current boundary is that this remains internal-only and bounded by tests/temp-local evidence. It does not expand public MCP, prove true live governance, close recall/write reliability, or make `memory_exclude` / `memory_forget` durable mutation adopters.

## Historical Reviewed Source Reality

Reviewed sources at the time:

- `src/storage/SqliteShadowStore.js`
- `src/core/ValidateMemoryService.js`
- `src/core/TombstoneMemoryService.js`
- `src/core/DurableGovernanceShadowProjectionPreview.js`
- `src/core/DurableGovernanceMutationPacketContract.js`
- existing `CM-0864` / `CM-0876` closeout docs

Historical bounded reality at the time:

- `ValidateMemoryService` uses one guarded `updateLifecycleStatus(...)` call for one record.
- `TombstoneMemoryService` uses one guarded `updateLifecycleStatus(...)` call for one record.
- `DurableGovernanceShadowProjectionPreview` already models supersede as a coordinated pair:
  - old record becomes `superseded`
  - replacement record becomes `active`
  - old record gets `superseded_by_memory_id`
  - replacement record gets `supersedes_memory_id`
- `SqliteShadowStore.updateLifecycleStatus(...)` is still fundamentally shaped as:
  - one `memory_id`
  - one `fromStatus`
  - one `toStatus`
  - optional `status_reason`
  - optional `tombstone_reason`
  - one pair of policy guards

## Why Two Single-Record Calls Are Not Enough

The obvious temptation would be:

1. call `updateLifecycleStatus(...)` for the old record
2. call `updateLifecycleStatus(...)` for the new record

This is not a sufficient seam for bounded supersede runtime-prep.

Problems:

- the current helper cannot write `supersedes_memory_id`
- the current helper cannot write `superseded_by_memory_id`
- there is no single guard envelope covering both records together
- there is no bounded guarantee that both lifecycle transitions and both link writes stay coherent

Even if link-writing were bolted onto the existing helper later, a pair of separate updates would still leave an unsafe intermediate class:

- old record already moved to `superseded`
- replacement record not yet moved to `active`
- one link written but not the other
- one policy snapshot stale while the other still passes

That is exactly the kind of half-applied shape the current bounded governance path has tried to avoid.

## Review Conclusion

If `memory_supersede` ever gets a runtime-prep or internal service layer, the next missing seam should be:

- one new guarded two-record shadow-store method

not:

- two independent reuses of `updateLifecycleStatus(...)`

The future seam should likely be a pair-oriented method whose shape is closer to:

- one old-record expectation bundle
- one replacement-record expectation bundle
- one correlated apply attempt
- one bounded success/failure result for the whole pair

## Exact Requirements For The Future Seam

Before any supersede service wiring, the future two-record seam should be able to do all of these in one bounded contract:

1. Verify old record expected state:
   - exact `memory_id`
   - exact allowed current `status`
   - exact `client_id`
   - exact `visibility`
2. Verify replacement record expected state:
   - exact `memory_id`
   - exact allowed current `status`
   - exact `client_id`
   - exact `visibility`
3. Apply both lifecycle transitions coherently:
   - old `status -> superseded`
   - replacement `status -> active`
4. Apply both supersession links coherently:
   - old `superseded_by_memory_id = replacement`
   - replacement `supersedes_memory_id = old`
5. Apply shared lifecycle metadata coherently:
   - `status_reason`
   - `lifecycle_updated_at`
   - `lifecycle_actor_client_id`
6. Return one bounded outcome that can drive:
   - committed audit follow-up
   - cancelled audit follow-up
   - fail-closed service result

## Audit Implication

This review also fixes one runtime-prep truth:

- a supersede service will need two previous snapshots, not one

Current single-record services use:

- one `previous_snapshot_ref`
- one guarded update
- one pending/committed/cancelled correlation flow

Supersede will need a correlated pair shape, for example:

- old previous snapshot
- replacement previous snapshot
- one shared mutation correlation id

That does not need implementation yet, but it confirms the storage seam should be designed first, not inferred later from two independent one-record updates.

## Recommendation

The next smallest safe step after this review is:

- a bounded design or helper slice that names the future two-record supersede shadow seam contract

The next step should not yet:

- add a supersede service
- add a supersede CLI/runtime entry
- add a third adopter to the shared internal runtime-entry gate

## Boundary

This review does not:

- add `memory_supersede` to the shared internal runtime-entry gate
- add `memory_supersede` to MCP
- add a supersede runtime service
- add a supersede CLI/runtime entry
- change `SqliteShadowStore` behavior
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Historical Next Safe Step

Run a bounded `memory_supersede` two-record shadow-seam contract/design slice before any attempt to wire supersede into runtime-prep, internal service, CLI, or shared internal runtime-entry gate adoption.
