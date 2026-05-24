# Recall Precision Internal-Only Boundary Review

Status: `RECALL_PRECISION_INTERNAL_ONLY_BOUNDARY_REVIEW_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0900` bounded source read-only review over the current recall precision proof seam after `CM-0898` and `CM-0899`

## Review Input

Reviewed artifacts:

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `src/core/TrueLiveRecallExecutorAdapter.js`
- `src/app.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `docs/RECALL_PRECISION_LIVE_PROOF_CONSUMPTION_PACKET.md`
- `docs/RECALL_PRECISION_CM0814_CANDIDATE_REBIND_PACKET.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`

This review does not execute true live `search_memory`, true live `record_memory`, provider/model/API calls, broad real-memory scans, direct `.jsonl` reads, raw memory-content reads, durable memory/audit writes, public MCP expansion, package/config/watchdog/startup changes, push, release, deploy, cutover, or readiness/reliability claims.

## Decision

The current recall precision proof seam should still be treated as internal-only in operational meaning.

`CM-0898` and `CM-0899` have now fixed two important facts:

- one exact future live-proof consumption seam exists;
- one exact strongest current candidate-family rebind boundary exists.

That is enough to treat the current seam as a real bounded internal proof surface.

It is not enough to reclassify the seam as default public `search_memory` behavior, ambient recall precision, or `memory recall reliable`.

## Findings

### 1. This seam is stronger than direct public `search_memory`, but it is still not public proof behavior

Accepted.

Current repository reality routes the proof through:

- `TrueLiveRecallReadonlyProofRunner.run(...)`
- `createTrueLiveRecallExecutorAdapter({ app })`
- `app.callTool('search_memory', ...)`

But that does not make the seam equivalent to ordinary public `search_memory`.

The runner and adapter inject internal-only execution context and enforce bounded proof semantics that ordinary public callers do not carry by default.

### 2. The controlling proof semantics live in internal runner/adapter context, not in ambient runtime behavior

Accepted.

The current seam depends on exact internal controls:

- `requestContext.noTokenReadOnly=true`
- `executionContext.requestSource='internal-true-live-recall-readonly-proof-runner'`
- `executionContext.noRawContentRead=true`
- `executionContext.precisionPolicyContext.enabled=true`
- `executionContext.precisionPolicyContext.proofNoResultMode=true`
- sanitized output only

Those conditions are what make the seam acceptable as a bounded proof surface.

They are not equivalent to “public `search_memory` now proves recall precision.”

### 3. This seam is closer to a dedicated internal proof lane than the write-preflight case, but it is still not readiness-bearing runtime behavior

Accepted.

Compared with write preflight:

- write preflight rides the normal public `record_memory` lane behind an opt-in flag;
- recall proof already uses a dedicated internal runner/adapter path with sealed context.

So recall’s current seam is stricter and cleaner than the write-side internal-only seam.

But even that stronger shape still does not create:

- default runtime recall precision behavior;
- ambient public proof behavior;
- `memory recall reliable`;
- `RC_READY`.

### 4. Current evidence is bounded proof-shape guidance, not live-proof execution approval

Accepted.

`CM-0898` fixes the only acceptable seam.

`CM-0899` fixes how the strongest current candidate family, `CM-0814`, must be rebound if it is ever chosen again.

What these still do not provide:

- a future exact query-family choice;
- a future exact baseline;
- a future exact approval line;
- a new exact-approved live recall run.

So the seam is now better specified, but still not approved for execution by default.

### 5. Future live recall proof should consume this exact seam, not a broader or parallel surface

Accepted.

If a future separately exact-approved live recall proof is ever chosen, the aligned route remains:

- current internal runner
- current internal adapter
- current internal context
- current sanitized no-raw-content path

It should not switch to:

- direct public `search_memory`
- `dashboard`
- `governance-report`
- `http-observe`
- ad hoc app/service calls
- a newly invented parallel runtime seam

### 6. The correct current boundary is “internal-only exact-approved proof seam, stronger than public search, still below recall reliability”

Accepted.

The current recall precision seam should therefore be described as:

- internal-only in operational meaning;
- future exact-approved proof seam only;
- stronger than direct public `search_memory`;
- stronger than generic app/service calls;
- still below live-proof execution;
- still below `memory recall reliable`.

## Why This Still Cannot Claim Memory Recall Reliable

`CM-0900` is review only.

Even after `CM-0898` and `CM-0899`, current evidence still does not prove:

- a newly exact-approved live recall execution;
- a newly rebound exact baseline;
- a newly rebound exact query family;
- durable recall precision across current real runtime state;
- `memory recall reliable`.

Therefore:

- `memory recall reliable` remains unclaimed;
- `complete? = no` remains the only safe interpretation;
- `RC_NOT_READY_BLOCKED` remains unchanged.

## Next Best Gap

The next best gap is no longer “what seam should future recall proof use.”

That is already fixed.

The better next step is:

- keep the current seam internal-only;
- and, only if later selected, consume this exact seam in one separately exact-approved live recall proof that explicitly rebinds:
  - exact query family
  - exact baseline
  - exact approval line/reference

That is preferable to:

- widening direct public `search_memory`;
- inventing a new parallel proof path;
- treating current packets as execution approval;
- or treating bounded guidance as `memory recall reliable`.

## Closeout

Result: `RECALL_PRECISION_INTERNAL_ONLY_BOUNDARY_REVIEW_COMPLETED_NOT_READY`.

`CM-0900` fixes the interpretation of the current recall-side seam:

- stronger than direct public `search_memory`;
- stronger than ad hoc app/service use;
- still internal-only in operational meaning;
- still a future exact-approved proof seam only;
- still not default runtime behavior;
- still not live-proof execution;
- still not `memory recall reliable`.

No reliability, readiness, release, production, V8, or VCP full-parity claim is made.

`RC_NOT_READY_BLOCKED` remains.
