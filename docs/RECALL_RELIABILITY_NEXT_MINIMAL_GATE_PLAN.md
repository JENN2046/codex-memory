# Recall Reliability Next Minimal Gate Plan

Date: 2026-05-23
Task: `CM-0817`
Validation: `CMV-0936`
Result: `RECALL_RELIABILITY_NEXT_MINIMAL_GATE_PREPARED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This planning slice narrows the current `memory recall reliable` blocker after CM-0814 through CM-0816.

It does not execute true live `search_memory`, does not execute true live `record_memory`, does not read raw memory content, does not read direct `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not claim readiness or `memory recall reliable`.

## Current Accepted Boundary

The current accepted recall boundary is:

- `CM-0814` proves one exact-approved post-hardening negative-control proof shape can execute through the approved internal runner / adapter path with `precisionPolicyContext.enabled=true`, `proofNoResultMode=true`, sanitized output only, `rawContentReturned=false`, and complete zero side-effect counters.
- `CM-0815` downgrades the prior exact NC1-NC4 suppression blocker for that exact proof shape only.
- `CM-0816` confirms the batch is now pushed and synced, but does not retroactively convert CM-0814 into synced-main execution evidence.

Therefore the current truth-table position remains:

- `memory recall reliable` = `bounded evidence only`
- `complete? = no`
- `RC_NOT_READY_BLOCKED` remains

## Remaining Recall Blockers

The remaining blockers are now narrower and more concrete:

1. Proof-shape narrowness:
   only one exact-approved sanitized live negative-control query family has passed.
2. Traceability drift:
   the internal proof context still reports legacy `CM-0774` approval labeling while the operator-approved live proof was `CM-0814`.
3. Execution-context classification:
   CM-0814 is clean local-head evidence from `17500cf...`, not synced-main proof.
4. Regression-surface thinness:
   recall quality still depends too much on a single live proof slice instead of a broader bounded fixture / temp-local / pipeline / runner regression surface.

## Accepted Next Evidence Classes

The next recall closure movement may use only these evidence classes:

- local source/test/docs review
- fixture-only evidence
- temp-local bounded evidence
- pipeline / runner / adapter bounded regression evidence
- separately exact-approved sanitized live proof evidence

The following still do not count as broad recall reliability closure:

- docs-only wording refresh
- post-push sync by itself
- one exact-proof shape alone
- precheck or gate success unrelated to recall quality

## Next Minimal Gate Sequence

### Gate 1: Traceability normalization

Prepare and, if approved, implement a local-safe patch so the internal proof context no longer advertises misleading legacy `CM-0774` approval labeling for the CM-0814 proof path.

Acceptance:

- changed-scope tests remain green
- no public MCP widening
- no live proof execution

### Gate 2: Expanded bounded recall-quality regression surface

Prepare and, if approved, implement additional bounded fixture / temp-local / pipeline / runner cases that lock:

- negative-control no-result behavior
- low-confidence suppression behavior
- sanitized score-distribution behavior
- fail-closed malformed/raw metadata behavior
- proof-context pass-through behavior

Acceptance:

- recall-quality regressions become less dependent on one live proof run
- no broad runtime claim

### Gate 3: Future exact-approved repeat proof boundary

Any future live recall proof intended to move beyond the current narrow blocker downgrade must:

- keep exact approval
- keep sanitized output only
- keep complete zero side-effect counters
- preserve explicit execution classification as either clean local-head evidence or synced-main evidence
- avoid overclaim from one run to broad reliability

## Decision

`RECALL_RELIABILITY_NEXT_MINIMAL_GATE_PREPARED_NOT_READY`

CM-0814 through CM-0816 narrow the recall blocker enough to define a clearer next minimal gate sequence. The next recall movement should first clean traceability drift and widen bounded regression evidence before any future exact-approved live proof tries to support a broader reliability argument. `memory recall reliable` remains bounded evidence only, truth table remains `complete? = no`, and `RC_NOT_READY_BLOCKED` remains.
