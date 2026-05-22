# True Live Recall Internal Proof Runner Implementation

Status: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_IMPLEMENTED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0777`
Decision: `RC_NOT_READY_BLOCKED`
Scope: minimal internal runner implementation and targeted synthetic tests only

## Purpose

This implementation adds the minimal internal proof runner surface required before any future CM-0774 true live real-store recall proof can be reconsidered.

The runner is internal-only. It does not add a public MCP tool and does not expand the public `search_memory` schema.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Implemented Files

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `tests/true-live-recall-internal-proof-runner.test.js`

No public MCP schema file was changed.

## Implemented Runner Boundary

The runner requires:

- exact approval line matching CM-0774
- exactly four query slots: `Q1`, `Q2`, `Q3`, `Q4`
- non-empty query family and text
- broad scan / export / raw memory / `.jsonl` query rejection
- sealed internal proof context
- `readOnly=true`
- `noProvider=true`
- `noAudit=true`
- `sanitizedOutput=true`
- `includeContent=false`

The runner calls an injected internal `searchExecutor` with the sealed proof context. This keeps the implementation testable without invoking the live real store.

## Fail-Closed Side-Effect Boundary

The runner fails closed if any side-effect counter is non-zero:

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

This makes provider/cache/sync/audit/write/vector-flush evidence explicit rather than inferred from `include_content=false`.

## Sanitized Output Boundary

The runner emits sanitized evidence only:

- task id
- baseline commit
- proof run id
- query count
- query family labels
- per-query elapsed time
- result count
- top result opaque id hash
- score number where available
- matched metadata key names only
- side-effect counters
- bounded error code
- not-ready decision

The runner strips raw text-bearing fields from emitted evidence. Targeted tests verify that raw `content`, `text`, `snippet`, and private title values from executor results do not appear in serialized runner output.

## Timeout And Error Handling

The runner uses `runSearchMemoryWithTimeout()`.

`SEARCH_MEMORY_TIMEOUT` is recorded as sanitized failed-not-ready evidence, not as a pass and not as readiness. Boundary violations for approval, query count, broad scan, or non-zero side-effect counters throw `TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION`.

## Targeted Validation

Passed:

```text
node --check src\core\TrueLiveRecallReadonlyProofRunner.js
node --check tests\true-live-recall-internal-proof-runner.test.js
node --test tests\true-live-recall-internal-proof-runner.test.js
```

Targeted test result: `4/4`.

Coverage:

- missing exact approval rejected
- non-exact query count rejected
- broad/raw-memory query rejected
- sealed proof context supplied to the internal executor
- `readOnly/noProvider/noAudit/sanitizedOutput/includeContent=false` enforced
- provider/cache/sync/audit/write/vector-flush counters fail closed
- sanitized evidence excludes raw `content`, `text`, `snippet`, and private title
- timeout emits bounded `SEARCH_MEMORY_TIMEOUT` failed-not-ready evidence

## Why CM-0774 Still Cannot Execute Yet

The internal runner now exists and has targeted synthetic coverage, but CM-0774 true live proof still requires a separate exact approval before any live real-store recall execution.

This implementation does not itself prove real-store recall reliability because it did not execute true live `search_memory`, did not read real memory content, did not validate real corpus quality, and did not run against the current local real store.

## No-Readiness Wording

This implementation does not claim:

- `memory recall reliable`
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

`RC_NOT_READY_BLOCKED` remains.

Result: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_IMPLEMENTED_SYNCED_NOT_READY`.
