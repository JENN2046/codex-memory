# True Live Recall Internal Proof Runner Patch

Status: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCHED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0779`
Decision: `RC_NOT_READY_BLOCKED`
Scope: targeted runner/test patch only; no true live proof execution

## Purpose

This patch closes the CM-0778 review findings against the CM-0777 internal proof runner. It makes missing, partial, malformed, or unknown-positive side-effect counters fail closed, and makes raw executor leakage fail closed before sanitized evidence can be emitted.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Changed Files

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `tests/true-live-recall-internal-proof-runner.test.js`

No public MCP schema file was changed.

## Patched Counter Boundary

The runner now requires explicit complete side-effect counters for every reviewed key:

- `providerCalls`
- `directJsonlReads`
- `durableMemoryWrites`
- `durableAuditWrites`
- `candidateCacheWrites`
- `candidateCacheFlushes`
- `syncCalls`
- `vectorFlushes`
- `embeddingCacheWrites`
- `rawMemoryContentReads`
- `publicMcpExpansion`

The runner fails closed for:

- missing `sideEffectCounters`
- partial counters
- non-number counters
- non-finite counters
- negative counters
- any required counter value other than `0`
- unknown positive side-effect counters

Missing evidence is no longer treated as zero evidence.

## Patched Raw Leakage Boundary

The runner now scans executor results before sanitization. If any result contains raw text-bearing fields, the run fails closed with `TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION`.

The current forbidden raw fields include:

- `content`
- `text`
- `snippet`
- `title`
- `rawText`
- `formattedWindow`
- `rawMemoryText`
- `chatHistory`
- `jsonlLine`

Sanitization no longer masks raw executor leakage.

## Targeted Validation

Passed:

```text
node --check src\core\TrueLiveRecallReadonlyProofRunner.js
node --check tests\true-live-recall-internal-proof-runner.test.js
node --test tests\true-live-recall-internal-proof-runner.test.js
```

Targeted test result: `6/6`.

Coverage:

- exact approval still required
- non-exact query count still rejected
- broad/raw query still rejected
- sealed `readOnly/noProvider/noAudit/sanitizedOutput/includeContent=false` context preserved
- missing counters fail closed
- partial counters fail closed
- malformed counters fail closed
- unknown positive side-effect counters fail closed
- reviewed non-zero side-effect counters fail closed
- raw `content`, `text`, `snippet`, and `title` executor fields fail closed
- timeout still emits bounded failed-not-ready evidence

## CM-0774 Execution Decision

This patch closes the CM-0778 runner-local findings, but it does not execute CM-0774.

A future CM-0774 true live proof still requires separate exact approval and a concrete internal executor adapter or equivalent wrapper at execution time. That future execution must remain sanitized, read-only, no-provider, no-audit, no direct `.jsonl` read, no durable write, and no-readiness.

## No-Readiness Wording

This patch does not claim:

- `memory recall reliable`
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

`RC_NOT_READY_BLOCKED` remains.

Result: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCHED_SYNCED_NOT_READY`.
