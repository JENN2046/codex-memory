# True Live Recall Internal Proof Runner Review

Status: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_NEEDS_PATCH`
Date: 2026-05-22
Task: `CM-0778`
Decision: `RC_NOT_READY_BLOCKED`
Scope: review of CM-0777 only; no true live proof execution

## Purpose

This review checks whether the CM-0777 internal proof runner implementation is sufficient to support a later separately exact-approved CM-0774 true live real-store recall proof.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `tests/true-live-recall-internal-proof-runner.test.js`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_IMPLEMENTATION.md`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PLAN.md`
- `docs/TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_GAP_PLAN.md`
- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Review Findings

### Accepted Boundaries

CM-0777 is a useful internal runner foundation:

- It does not expand the public MCP schema.
- It requires the CM-0774 exact approval line before running the injected executor.
- It enforces exactly four ordered query slots: `Q1`, `Q2`, `Q3`, `Q4`.
- It rejects obvious broad-scan, export, raw-memory, and `.jsonl` query text.
- It constructs a sealed proof context with `readOnly=true`, `noProvider=true`, `noAudit=true`, `sanitizedOutput=true`, and `includeContent=false`.
- It passes the sealed context and proof flags to the injected `searchExecutor`.
- It strips raw result values from emitted evidence and emits only sanitized counts, hash/opaque id, score, metadata key names, side-effect counters, and bounded error codes.
- It fails closed when a supplied side-effect counter is non-zero for provider, direct `.jsonl`, durable memory, durable audit, candidate cache write/flush, sync, vector flush, embedding cache write, raw memory content read, or public MCP expansion.
- It records `SEARCH_MEMORY_TIMEOUT` as failed-not-ready evidence rather than a pass.

The targeted test suite passed `4/4` for the synthetic runner boundary. That coverage is sufficient for the current implementation review baseline, but it is not sufficient for immediate true live execution.

### Blocking Gaps Before CM-0774 Execution

CM-0777 still needs a small patch before it can support separately exact-approved CM-0774 execution:

1. Missing side-effect counters currently normalize to zero.

   `assertZeroSideEffects(response?.sideEffectCounters)` accepts an absent or partial counter object by filling missing keys with `0`. For a true live proof, missing evidence is not zero evidence. The runner should fail closed unless every required counter key is present, numeric, finite, and exactly zero.

2. Raw result fields are sanitized away but not detected as leakage.

   The current test deliberately returns raw `content`, `text`, `snippet`, and title values and verifies they do not appear in serialized output. That proves output sanitization, but the report still hardcodes `rawContentReturned=false`. For CM-0774, a live executor returning raw memory text should be either recorded as a boundary failure or explicitly detected before sanitized output is emitted.

3. No live internal executor adapter is reviewed yet.

   The runner is injection-based, which is good for minimal surface and tests, but this review did not verify a concrete internal executor that calls the real `search_memory` path while producing trustworthy side-effect counters. CM-0774 execution still needs that exact adapter or an equivalent approved execution wrapper.

## Required Patch Criteria

The next minimal patch should:

- require all side-effect counter keys to be present
- reject missing, non-numeric, non-finite, negative, or partial counters
- detect raw text-bearing fields such as `content`, `text`, `snippet`, and raw title values in executor results
- fail closed or explicitly label raw-output leakage instead of hardcoding `rawContentReturned=false`
- add targeted tests for missing counters, partial counters, malformed counters, and raw field leakage
- keep public MCP schema unchanged
- keep CM-0774 unexecuted until a separate exact approval is supplied

## CM-0774 Execution Decision

Decision: do not proceed to CM-0774 true live execution yet.

The implementation is close and useful, but the current proof boundary still treats absent counter evidence as zero and does not fail closed when the executor returns raw text-bearing fields. Therefore the implementation is not yet sufficient to support separately exact-approved CM-0774 execution.

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

Result: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_NEEDS_PATCH`.
