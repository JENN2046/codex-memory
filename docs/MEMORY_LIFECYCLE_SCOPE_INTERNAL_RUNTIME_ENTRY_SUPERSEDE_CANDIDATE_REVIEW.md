# Memory Lifecycle Scope Internal Runtime Entry Supersede Candidate Review

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_CANDIDATE_REVIEW_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Answer the exact follow-up opened by `CM-0875`:

- can `memory_supersede` ever become the next adopter of the shared internal runtime-entry gate;
- if not now, what is the smallest remaining runtime-prep gap.

This slice is source read-only:

- no runtime mutation
- no public MCP expansion
- no readiness claim

## Current-State Supersession Note

This review is retained as historical decision trace for the CM-0876-era source reality.

It must not be used as current evidence that supersede lacks service, CLI, app wiring, or runtime-entry surfaces. Current source and committed review evidence supersede that old gap analysis:

- `src/core/SupersedeMemoryService.js` exists
- `src/app.js` wires the supersede service and exposes `app.executeInternalSupersede(...)`
- `src/cli/supersede-memory.js` exists as an internal dry-run-first CLI
- `tests/supersede-memory-runtime-entry.test.js` covers the default-disabled internal runtime entry
- `docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_FAMILY_STABILIZATION_REVIEW.md` records the current shared-gate family as `validate + tombstone + supersede`

The still-current boundary is that supersede remains internal-only and not public MCP. This historical review does not prove live governance, live recall/write reliability, production readiness, or deferred `memory_exclude` / `memory_forget` durable mutation readiness.

## Historical Reviewed Source Reality

Reviewed sources at the time:

- `src/core/InternalRuntimeEntryGate.js`
- `src/core/DurableGovernanceMutationPacketContract.js`
- `src/core/DurableGovernanceShadowProjectionPreview.js`
- `src/storage/SqliteShadowStore.js`
- `src/core/ValidateMemoryService.js`
- `src/core/TombstoneMemoryService.js`
- existing `CM-0864` / `CM-0865` / `CM-0874` / `CM-0875` closeout docs

Historical bounded reality at the time:

- `memory_supersede` already exists as an internal blocked family in the packet contract.
- `memory_supersede` already has bounded projection semantics in `DurableGovernanceShadowProjectionPreview`:
  - old record `status -> superseded`
  - replacement record `status -> active`
  - bidirectional `superseded_by_memory_id` / `supersedes_memory_id` preview
- the shared internal runtime-entry gate can already normalize internal payloads and enforce default-disabled approved-context execution.

But the runtime seam is still materially different from `validate` and `tombstone`:

- `ValidateMemoryService` is one-record lifecycle mutation.
- `TombstoneMemoryService` is one-record lifecycle mutation.
- `memory_supersede` is two-record coordinated mutation:
  - old record state transition
  - replacement record state transition
  - old->new link write
  - new->old link write
  - shared policy/scope consistency across both records

## Exact Blocking Gaps

`memory_supersede` is still blocked from gate adoption because the current runtime surface does not yet prove a safe two-record apply seam.

Exact gaps:

1. No internal supersede service exists.
2. No bounded supersede runtime-prep helper exists.
3. `SqliteShadowStore.updateLifecycleStatus(...)` is still single-record only.
4. There is no guarded two-record compare-and-apply seam that can:
   - verify both records still match expected lifecycle/scope policy;
   - write both lifecycle transitions coherently;
   - write bidirectional supersession links coherently.
5. Current real runtime references (`ValidateMemoryService`, `TombstoneMemoryService`) do not yet prove the transactional/error-handling shape needed for this two-record class.

## Review Conclusion

`memory_supersede` should not adopt the shared internal runtime-entry gate yet.

This is not because supersede lacks all bounded evidence.

It already has:

- packet-contract recognition
- projection-preview semantics
- converged SQLite field vocabulary

But it still lacks the first runtime-facing layer that would make gate adoption responsible:

- a bounded runtime-prep/apply-plan surface for two-record mutation
- a named guarded shadow-store seam for bidirectional supersession writes

So the current shared internal runtime-entry gate should still remain:

- `validate`
- `tombstone`

only.

## Historical Smallest Safe Next Step

The next smallest safe step is not direct supersede service wiring.

It is a bounded internal runtime-prep / storage-seam review slice that fixes the exact two-record apply shape first.

Recommended next candidate:

- a `memory_supersede` runtime-prep / two-record storage-seam review

That next slice should answer:

- whether the future apply path needs one new guarded shadow-store method or a pair of coordinated guarded updates;
- how bidirectional link writes should fail closed;
- how pending/committed/cancelled audit follow-up should be shaped for a two-record mutation without overclaiming transactionality.

## Boundary

This review does not:

- add `memory_supersede` to the shared internal runtime-entry gate
- add `memory_supersede` to MCP
- add a supersede runtime service
- add a supersede CLI/runtime entry
- execute true live memory actions
- call providers or external APIs
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

## Historical Next Safe Step

Run a bounded `memory_supersede` runtime-prep / two-record storage-seam review before any attempt to add a third adopter to the shared internal runtime-entry gate.
