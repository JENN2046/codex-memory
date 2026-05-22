# True Live Recall Internal Proof Runner Patch Review

Status: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCH_REVIEW_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0780`
Decision: `RC_NOT_READY_BLOCKED`
Scope: review of CM-0779 patch only; no true live proof execution

## Purpose

This review checks whether the CM-0779 internal proof runner patch truly closes the CM-0778 runner-local findings for side-effect counter evidence and raw executor leakage.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `tests/true-live-recall-internal-proof-runner.test.js`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCH.md`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_REVIEW.md`
- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Review Findings

### Side-Effect Counter Presence

Accepted.

`assertZeroSideEffects(counters)` now rejects missing, non-object, or array counters with `side_effect_counters_missing`.

It computes missing required keys from `REQUIRED_SIDE_EFFECT_COUNTER_KEYS` and fails closed with `side_effect_counter_missing` when any reviewed counter is absent. This closes the CM-0778 gap where missing evidence could normalize to zero evidence.

### Missing And Partial Counters

Accepted.

The targeted test `internal proof runner requires complete finite zero side-effect counters` covers both:

- missing `sideEffectCounters`
- partial counters with one required key removed

Both cases are expected to reject before sanitized evidence can be emitted.

### Malformed / Non-Finite / Negative Counters

Accepted.

The runner now requires every required counter value to be a number, finite, and non-negative. The targeted test covers string, negative, and `NaN` counter values and expects `side_effect_counter_malformed`.

### Required Non-Zero Counters

Accepted.

The existing non-zero side-effect test still iterates the reviewed side-effect keys and expects `side_effect_counter_nonzero` for provider, direct `.jsonl`, durable memory, durable audit, cache, sync, vector, embedding, raw memory content, and public MCP expansion counters.

### Unknown-Positive Counters

Accepted.

The runner now scans unknown counter keys and fails closed when an unknown counter has a finite positive value. The targeted test covers `unreviewedWriteCounter: 1` and expects `side_effect_counter_unknown_nonzero`.

This preserves fail-closed behavior when a future executor reports a new positive side-effect dimension that the runner has not reviewed yet.

### Raw Executor Leakage Before Sanitization

Accepted for runner-local boundary.

The runner now calls `assertNoRawExecutorLeakage(results)` before `sanitizeResult(results[0])`. Any executor result containing forbidden raw fields causes `TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION` with `raw_executor_leakage_detected`.

The targeted test covers raw `content`, `text`, `snippet`, and `title` fields, and verifies the raw private sentinel text is not serialized into the thrown error.

The forbidden key set also includes `rawText`, `formattedWindow`, `rawMemoryText`, `chatHistory`, and `jsonlLine`.

### Targeted Test Coverage

Accepted.

The targeted test suite now covers the core CM-0778 risks:

- exact approval still required
- non-exact query count rejected
- broad/raw query rejected
- sealed `readOnly/noProvider/noAudit/sanitizedOutput/includeContent=false` context preserved
- missing counters fail closed
- partial counters fail closed
- malformed counters fail closed
- unknown-positive counters fail closed
- reviewed non-zero side-effect counters fail closed
- raw executor `content`, `text`, `snippet`, and `title` fail closed before sanitization
- bounded timeout remains failed-not-ready evidence

Targeted validation remains `6/6`.

## Remaining Gap

CM-0779 closes the runner-local findings from CM-0778, but it still does not review a concrete live executor adapter.

The internal runner is injection-based. That is good for preserving public MCP freeze and testability, but CM-0774 execution still needs an execution-time concrete internal executor adapter or equivalent wrapper that can prove it calls the intended local `search_memory` path while supplying trustworthy complete side-effect counters.

This review therefore does not by itself execute or authorize CM-0774.

## CM-0774 Execution Decision

Decision: CM-0779 is sufficient to proceed to a future separately exact-approved CM-0774 execution preparation step, but not to execute CM-0774 in this slice.

Before any true live proof execution, all of the following must still be true:

- the operator supplies the separate exact CM-0774 approval line
- current Git state is checked and clean
- the execution uses a concrete internal executor adapter or equivalent wrapper reviewed for trustworthy side-effect counters
- output remains sanitized
- provider calls remain blocked
- direct `.jsonl` and durable memory content reads remain blocked
- durable memory/audit writes remain blocked
- public MCP expansion remains blocked
- readiness claims remain blocked

## No-Readiness Wording

This review does not claim:

- `memory recall reliable`
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

`RC_NOT_READY_BLOCKED` remains.

Result: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCH_REVIEW_COMPLETED_SYNCED_NOT_READY`.
