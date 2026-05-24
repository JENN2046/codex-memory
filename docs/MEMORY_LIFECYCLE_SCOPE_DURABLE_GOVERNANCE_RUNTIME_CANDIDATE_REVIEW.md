# Memory Lifecycle Scope Durable Governance Runtime Candidate Review

Status: `MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_RUNTIME_CANDIDATE_REVIEW_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0864`

## Purpose

CM-0860 fixed the durable governance mutation design direction.

CM-0861 locked the packet contract.

CM-0862 added a fail-closed dry-run preview.

CM-0863 added a fixture-backed shadow projection proof.

What still remained unclear was the next smallest runtime-facing step:

- which current source seams are actually usable;
- which mutation family is small enough to go first;
- what must still stay blocked before any runtime apply is even considered.

CM-0864 answers that question through source read-only review.

This is a review packet only.

It does not execute durable governance mutation, append new audit events, mutate SQLite state, expose new MCP tools, or claim readiness/reliability.

## Current-State Supersession Note

This document is retained as historical decision trace for the CM-0864 runtime-candidate review.

It must not be read as current evidence that tombstone or supersede internal runtime layers are absent. Later committed source/test evidence supersedes that old blocker framing:

- `TombstoneMemoryService` and `SupersedeMemoryService` now exist as internal services.
- internal app surfaces and internal CLI entries now exist for tombstone and supersede.
- the shared internal runtime-entry family is now stabilized on `validate + tombstone + supersede`.

The still-current part of this review is the boundary discipline: these remain internal-only and do not prove public MCP readiness, live governance proof, live recall/write reliability, RC readiness, or production readiness.

## Historical Reviewed Runtime Surfaces

### 1. `ValidateMemoryService`

`src/core/ValidateMemoryService.js` already provides the closest real runtime reference.

It proves an internal-only mutation shape with:

- explicit schema validation;
- lifecycle transition eligibility checks;
- scope/privacy guardrails;
- dry-run-first behavior;
- pending audit intent before mutation;
- guarded SQLite lifecycle update;
- committed or cancelled audit follow-up;
- fail-closed rejection on pre-mutation audit failure.

This means the project already has one working template for:

- internal-only governed mutation;
- append-only audit posture;
- guarded current-state projection update.

### 2. Historical `SqliteShadowStore.updateLifecycleStatus()` Snapshot

`src/storage/SqliteShadowStore.js` currently exposes one bounded lifecycle mutation seam:

- required `memory_id` + `from_status`;
- exact `client_id` / `visibility` guard;
- update of:
  - `status`
  - `updated_at`
  - optional `lifecycle_updated_at`
  - optional `lifecycle_actor_client_id`
  - optional `status_reason`

What it did not expose at that time was equally important:

- no `supersedes_memory_id` update surface;
- no `superseded_by_memory_id` update surface;
- no `tombstone_reason` update surface;
- no two-record transactional helper for supersession.

So current runtime reality is still closer to:

- single-record lifecycle mutation,

than to:

- bidirectional supersession projection.

### 3. Lifecycle SQLite Dry-Run

`src/cli/lifecycle-sqlite-dry-run.js` already names the future lifecycle projection columns:

- `status`
- `status_reason`
- `supersedes_memory_id`
- `superseded_by_memory_id`
- `tombstone_reason`
- `lifecycle_updated_at`
- `lifecycle_actor_client_id`

That matters because the CM-0863 projection helper currently previews logical fields as:

- `supersedes`
- `supersededBy`
- `tombstoneReason`

So there is still a naming-convergence gap between:

- runtime SQLite projection vocabulary,

and:

- current explicit-input projection-preview vocabulary.

### 4. `DurableGovernanceShadowProjectionPreview`

`src/core/DurableGovernanceShadowProjectionPreview.js` now proves:

- `memory_supersede`
- `memory_tombstone`

in fixture-backed form.

But it remains:

- explicit-input only;
- projection-preview only;
- non-transactional;
- detached from real SQLite row mutation.

This means CM-0863 is sufficient to narrow the next runtime candidate,
but not sufficient to justify runtime apply directly.

### 5. Public Exposure Boundary

Current source review still shows no approved public runtime surface for these mutation families.

The future names appear in the HTTP no-token blocked list, but that is not tool exposure.

The public MCP contract remains frozen at:

- `record_memory`
- `search_memory`
- `memory_overview`

So the next runtime candidate must remain:

- internal-only;
- non-public-MCP;
- approval-bound.

## Candidate Comparison

### Candidate A: `memory_supersede` first

Strengths:

- aligns with long-term replacement/supersession governance;
- already covered by CM-0863 fixture-backed projection preview.

Weaknesses:

- requires two-record mutation;
- requires bidirectional link projection;
- requires field-name convergence for `supersedes` / `supersededBy`;
- needs stronger transactional semantics than the current `ValidateMemoryService` reference path proves.

Conclusion:

- too wide for the first runtime candidate.

### Candidate B: `memory_tombstone` first

Strengths:

- single-record mutation;
- fits current `ValidateMemoryService` mental model much better;
- can reuse `status_reason`, `lifecycle_updated_at`, `lifecycle_actor_client_id`;
- only needs one additional projected metadata field of clear meaning: `tombstone_reason`;
- already covered by CM-0863 fixture-backed projection preview.

Weaknesses:

- still needs explicit `tombstone_reason` projection support in the runtime write seam;
- still needs dedicated audit event family and internal-only mutation service shape.

Conclusion:

- smallest credible next runtime candidate.

## Review Decision

CM-0864 selects this next runtime direction:

1. the first durable governance runtime candidate should stay internal-only;
2. it should follow the `ValidateMemoryService` execution pattern;
3. it should be `memory_tombstone` before `memory_supersede`;
4. `memory_supersede` should remain blocked until:
   - two-record shadow projection semantics are explicit;
   - field-name convergence is fixed;
   - bidirectional link mutation and rollback posture are better defined.

## Minimal Runtime Candidate Shape

The smallest future runtime candidate should look like:

1. explicit internal packet input;
2. CM-0862 dry-run preview acceptance;
3. CM-0863 tombstone projection preview acceptance;
4. pending audit intent append;
5. guarded single-record shadow update;
6. committed or cancelled audit append;
7. normalized revision + changed-memory-id emission.

That is materially closer to current source reality than a first-pass supersede runtime path.

## What Must Still Stay Blocked

CM-0864 does not justify:

- public MCP governance tools;
- `memory_supersede` runtime apply;
- broad SQLite schema rewrite;
- physical delete / hard forget;
- provider/service/config/startup changes;
- true live governance proof;
- `memory write reliable`;
- `memory recall reliable`;
- `RC ready`;
- production readiness.

## Historical Next Implementation Ladder

Recommended next sequence after CM-0864:

1. narrow `memory_tombstone` runtime-candidate plan or helper contract;
2. align projection field naming with SQLite lifecycle column vocabulary;
3. only then consider a temp-local or bounded internal runtime proof for tombstone apply;
4. keep supersede runtime apply deferred until tombstone-first path is coherent.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_RUNTIME_CANDIDATE_REVIEW_COMPLETED_NOT_READY`

The next smallest runtime-facing durable governance candidate is:

- internal-only
- tombstone-first
- single-record
- audit-before-mutation
- guarded shadow projection update

`memory_supersede` is still too wide to go first.
