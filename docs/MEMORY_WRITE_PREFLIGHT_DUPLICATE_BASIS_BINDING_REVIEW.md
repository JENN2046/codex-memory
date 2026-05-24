# Memory Write Preflight Duplicate Basis Binding Review

Status: `MEMORY_WRITE_PREFLIGHT_DUPLICATE_BASIS_BINDING_REVIEW_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0896` bounded source/doc review only; no execution approval, no live write

## Purpose

`CM-0895` fixed which seam a future separately exact-approved live write proof must consume.

This review fixes the next narrower question:

What can count as an acceptable prebound duplicate basis for that future proof?

The answer must stay compatible with all existing boundaries:

- no broad scan
- no `search_memory`
- no second write
- no public MCP expansion
- no default-on runtime behavior
- no readiness or reliability overclaim

## Reviewed Inputs

- `docs/MEMORY_WRITE_PREFLIGHT_LIVE_WRITE_PROOF_CONSUMPTION_PACKET.md`
- `docs/MEMORY_WRITE_PROOF_SURFACE_PLAN.md`
- `docs/MEMORY_WRITE_EVIDENCE_REVIEW.md`
- `docs/MEMORY_WRITE_RELIABILITY_BOUNDED_REVIEW.md`
- `docs/MEMORY_WRITE_PREFLIGHT_EXACT_SCOPE_CANDIDATE_SOURCE_HELPER.md`
- `docs/MEMORY_WRITE_PREFLIGHT_APP_WIRING.md`
- `docs/MEMORY_WRITE_PREFLIGHT_APP_TEMP_LOCAL_EVIDENCE.md`
- `STATUS.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/VALIDATION_LOG.md`

## Decision

Any future separately exact-approved live write proof must bind one duplicate basis before execution.

That basis must be exact, narrow, and already known.

It must not be discovered by:

- a broad runtime scan
- `search_memory`
- an exploratory read
- a first write followed by a second write

## Accepted Duplicate-Basis Families

The following basis families are acceptable in principle.

### 1. Prior accepted bounded canary basis

The strongest currently known family is:

- one previously accepted exact-approved bounded write
- with a known `memoryId`
- known `target`
- known reviewed scope tuple
- known deterministic canary payload family

Current repository evidence already contains one such bounded accepted write:

- `CM-0737`
- accepted `memoryId = codex-process-1ef539a197d747e199e12fe1c0d69731`
- `target = process`
- repaired checkpoint-shaped payload family

This does not automatically authorize future execution.

It only means that a future packet may choose this as a candidate duplicate basis if:

- the future packet explicitly names it
- the baseline is rebound
- the scope assumptions are rechecked
- the proof still stays one-write-only

### 2. Separately supplied exact operator basis

A future packet may instead use one operator-supplied exact basis if it already includes:

- one exact `memoryId`
- one exact target
- one exact scope tuple
- one approved canary/reference description

That basis must be named before execution.

It must not require broad lookup at execution time.

### 3. Prebound canonical-hash basis

A future packet may use one exact canonical-hash basis only if it is already prebound outside execution and carried into the packet as explicit input.

That means:

- one exact payload family
- one exact scope tuple
- one exact target
- one exact expected duplicate identity basis

The live-proof run itself must not discover or derive this by exploring current real store state beyond the bounded app seam already under review.

## Rejected Duplicate-Basis Families

The following basis families are not acceptable:

### 1. Broad target scan

Rejected:

- `listRecords(target)` style discovery
- target-wide row inspection
- "look around first and then choose one"

Reason:

- too broad
- violates the bounded write-proof shape
- reintroduces scan semantics that `CM-0890` and `CM-0891` intentionally avoided

### 2. Search-based discovery

Rejected:

- `search_memory`
- marker search
- recall query as duplicate discovery

Reason:

- changes the proof from write-path evidence into mixed recall+write behavior
- widens side effects and interpretation surface

### 3. Two-write manufacture

Rejected:

- first write to create the basis
- second write to prove duplicate suppression

Reason:

- violates the one-write-only boundary
- makes the proof depend on a second mutation
- would overstate what the current seam is meant to prove

### 4. Broad real-store exploration

Rejected:

- ad hoc SQLite exploration
- raw diary or `.jsonl` discovery
- raw durable audit read for candidate hunting

Reason:

- too broad
- leaks outside the accepted sanitized proof lane

## Current Best Duplicate-Basis Interpretation

The safest current interpretation is:

- the future proof should prefer one already reviewed bounded basis
- `CM-0737` is the clearest current candidate family
- but `CM-0737` is not self-authorizing
- a future exact-approved packet must still explicitly rebind:
  - target baseline
  - exact basis identity
  - exact scope assumptions
  - exact one-write-only boundary

## What This Still Does Not Approve

This review does not approve:

- true live `record_memory`
- using `CM-0737` automatically
- `search_memory`
- broad scans
- second-write proof shape
- default-on preflight
- `memory write reliable`
- `RC_READY`

## Next Safe Direction

If a future separately exact-approved live write proof is ever chosen, the next narrow packet should bind one of these exact basis families explicitly:

- `CM-0737` accepted bounded canary basis
- or one separately supplied exact operator basis
- or one prebound canonical-hash basis

But until such a packet is explicitly chosen, the current seam should remain:

- internal-only
- opt-in
- not default runtime behavior
- not live proof

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_DUPLICATE_BASIS_BINDING_REVIEW_COMPLETED_NOT_READY`.

`CM-0896` fixes the next future-proofing gap after `CM-0895`:

- acceptable duplicate basis must be exact and prebound
- broad scan, search-based discovery, and two-write manufacture are rejected
- `CM-0737` is the strongest current candidate family, but not automatic authorization

No execution approval, no live write, no public MCP expansion, and no readiness/reliability claim is made.

`RC_NOT_READY_BLOCKED` remains.
