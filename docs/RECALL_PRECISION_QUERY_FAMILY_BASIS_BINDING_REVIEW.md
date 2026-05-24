# Recall Precision Query-Family Basis Binding Review

Status: `RECALL_PRECISION_QUERY_FAMILY_BASIS_BINDING_REVIEW_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0901` bounded source/doc review only; no execution approval, no live recall run

## Purpose

`CM-0898` fixed which seam a future separately exact-approved live recall proof must consume.

`CM-0899` fixed what must be rebound if that future proof explicitly chooses the strongest current candidate family, `CM-0814`.

`CM-0900` fixed that the current seam is still operationally internal-only.

This review fixes the next narrower question:

What can count as an acceptable prebound query-family / baseline basis for any future separately exact-approved live recall proof?

The answer must stay compatible with all existing boundaries:

- no public `search_memory` proof seam
- no ad hoc runtime path
- no broad real-memory scan
- no raw-memory read
- no public MCP expansion
- no readiness or reliability overclaim

## Reviewed Inputs

- `docs/RECALL_PRECISION_LIVE_PROOF_CONSUMPTION_PACKET.md`
- `docs/RECALL_PRECISION_CM0814_CANDIDATE_REBIND_PACKET.md`
- `docs/RECALL_PRECISION_INTERNAL_ONLY_BOUNDARY_REVIEW.md`
- `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_PLAN.md`
- `docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION.md`
- `STATUS.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/VALIDATION_LOG.md`

## Decision

Any future separately exact-approved live recall proof must bind one exact query-family / baseline basis before execution.

That basis must be exact, narrow, and already known.

It must not be discovered by:

- ad hoc runtime query exploration
- public `search_memory`
- `dashboard`
- `governance-report`
- `http-observe`
- broad real-memory exploration
- mixing historical slots after the fact

## Accepted Query-Family / Baseline Basis Families

The following basis families are acceptable in principle.

### 1. Prior accepted bounded negative-control family

The strongest current family is:

- one previously executed exact-approved bounded recall proof family
- one exact internal proof seam
- one exact ordered four-slot negative-control query family
- one exact expected per-slot result-count rule
- one known reviewed baseline class

Current repository evidence already contains one such bounded family:

- `CM-0814`
- post-hardening stricter negative-control NC1-NC4 family
- `precisionPolicyContext.enabled=true`
- `proofNoResultMode=true`
- four exact ordered negative-control slots
- expected `resultCount=0` for every slot
- sanitized output only
- complete zero side-effect counters

This does not automatically authorize future execution.

It only means that a future packet may choose this as a candidate basis if:

- the future packet explicitly names it
- the baseline is rebound
- the exact four-slot family is rebound
- the interpretation of nonzero slots is rebound
- the one-run-only boundary is rebound

### 2. Separately supplied exact operator query family

A future packet may instead use one separately supplied exact query family if it already includes:

- one exact ordered query set
- one exact slot count
- one exact per-slot expected result-count rule
- one exact proof seam
- one exact branch/baseline statement

That family must be named before execution.

It must not require ad hoc query discovery at execution time.

### 3. Prebound canonical proof packet family

A future packet may use one exact prebound proof packet family only if it is already fixed outside execution and carried into the run as explicit input.

That means:

- one exact ordered query set
- one exact slot interpretation
- one exact baseline family
- one exact one-run-only boundary

The live-proof run itself must not invent or tune that family by exploring current runtime state.

## Rejected Query-Family / Baseline Basis Families

The following basis families are not acceptable.

### 1. Ad hoc query discovery

Rejected:

- “look around and choose queries”
- exploratory negative-control wording
- discovering the future proof family during the run

Reason:

- too broad
- collapses the proof into exploration instead of bounded execution

### 2. Public search-based discovery

Rejected:

- direct public `search_memory`
- public search result inspection to design the proof family
- recall-query discovery outside the internal proof seam

Reason:

- changes the proof from bounded internal seam evidence into mixed public search exploration
- widens interpretation surface

### 3. Mixed historical slot inheritance

Rejected:

- taking some slots from `CM-0801`
- some slots from `CM-0803`
- some interpretation from `CM-0814`
- then treating the mixture as already approved

Reason:

- reintroduces silent inheritance
- defeats the explicit rebind rule from `CM-0899`

### 4. Broad real-store exploration

Rejected:

- broad runtime browsing
- raw diary or `.jsonl` discovery
- raw durable memory inspection for query selection

Reason:

- too broad
- leaks outside the accepted sanitized proof lane

### 5. Historical baseline inheritance without recheck

Rejected:

- reusing old local/synced baseline labels as if still current
- assuming `CM-0814` baseline remains valid without fresh recheck

Reason:

- future proof must always bind a fresh baseline

## Current Best Basis Interpretation

The safest current interpretation is:

- the future proof should prefer one already reviewed bounded family
- `CM-0814` is the clearest current candidate family
- but `CM-0814` is not self-authorizing
- a future exact-approved packet must still explicitly rebind:
  - baseline
  - approval line/reference
  - exact seam
  - exact ordered query family
  - exact result-count rule
  - exact nonzero-slot interpretation
  - exact one-run-only boundary

## What This Still Does Not Approve

This review does not approve:

- true live `search_memory`
- true live `record_memory`
- automatic reuse of `CM-0814`
- ad hoc query discovery
- public `search_memory` as proof seam
- broad real-store exploration
- `memory recall reliable`
- `RC_READY`

## Next Safe Direction

If a future separately exact-approved live recall proof is ever chosen, the next narrow packet should bind one of these exact basis families explicitly:

- `CM-0814` accepted bounded negative-control family
- or one separately supplied exact operator query family
- or one prebound canonical proof packet family

But until such a packet is explicitly chosen, the current seam should remain:

- internal-only
- exact-approved only
- not default runtime behavior
- not live proof

## Closeout

Result: `RECALL_PRECISION_QUERY_FAMILY_BASIS_BINDING_REVIEW_COMPLETED_NOT_READY`.

`CM-0901` fixes the next future-proofing gap after `CM-0898 + CM-0899 + CM-0900`:

- acceptable recall proof basis must be exact and prebound
- ad hoc query discovery, public search-based discovery, mixed historical slot inheritance, and broad runtime exploration are rejected
- `CM-0814` is the strongest current candidate family, but not automatic authorization

No execution approval, no live recall run, no public MCP expansion, and no readiness/reliability claim is made.

`RC_NOT_READY_BLOCKED` remains.
