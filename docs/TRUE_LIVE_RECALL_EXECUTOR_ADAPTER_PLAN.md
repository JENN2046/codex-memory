# True Live Recall Executor Adapter Plan

Status: `TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_PLAN_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0781`
Decision: `RC_NOT_READY_BLOCKED`
Scope: concrete internal executor adapter / wrapper plan only; no true live proof execution

## Purpose

This plan closes the planning gap identified by `CM-0780`: the internal proof runner now fails closed on incomplete counters and raw executor leakage, but it still needs a concrete internal executor adapter or equivalent wrapper before any separately exact-approved `CM-0774` true live real-store proof can be considered.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, does not change package/config/watchdog/startup behavior, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `tests/true-live-recall-internal-proof-runner.test.js`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PLAN.md`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_IMPLEMENTATION.md`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCH_REVIEW.md`
- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `src/app.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/recall/CandidateGenerator.js`
- `src/recall/ContextVectorManager.js`
- `src/recall/RerankService.js`
- `src/storage/VectorIndexStore.js`
- `src/storage/CandidateCacheStore.js`
- `src/recall/RecallAuditService.js`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `.agent_board/*`

## Source Reality

The current internal runner is injection-based. It accepts a `searchExecutor` and already enforces:

- exact approval line
- exactly four ordered query slots
- sealed proof context
- `includeContent=false`
- `readOnly=true`
- `noProvider=true`
- `noAudit=true`
- `sanitizedOutput=true`
- complete zero side-effect counters
- raw executor leakage fail-closed before runner sanitization

The current application search path has useful read-only behavior but is not yet a proof adapter:

- `src/app.js` derives `readOnly` from `requestContext.noTokenReadOnly === true`.
- `KnowledgeBaseRecallPipeline.search()` skips `knowledgeBaseSyncService.syncTarget()` and `recordAudit()` when `readOnly=true`.
- `CandidateGenerator.generate()` skips `candidateCacheStore.set()` when `readOnly=true`.
- `VectorIndexStore.getSingleEmbeddingCached()` avoids external embedding and embedding-cache writes when `readOnly=true`.
- `RerankService.rerank()` avoids remote rerank when `options.readOnly=true`.
- `executeSearchMemory()` returns ordinary search results and no `sideEffectCounters`.
- Ordinary `search_memory` results may include raw-bearing fields such as `title`, `snippet`, and `text`; those fields cannot cross the runner executor boundary because `CM-0779` correctly fails closed before sanitization.

Therefore the adapter must be an internal wrapper that both invokes the intended local search path and converts the response into a runner-safe executor response with complete counters.

## Adapter Placement

Recommended Day 2 implementation target:

```text
src/core/TrueLiveRecallExecutorAdapter.js
tests/true-live-recall-executor-adapter.test.js
```

The adapter should not add a public MCP tool, should not expand `search_memory` schema, and should not add a package script unless a later task explicitly approves that surface.

Recommended exported factory:

```text
createTrueLiveRecallExecutorAdapter({ app, now, createBoundaryError })
```

The factory returns a `searchExecutor(request)` suitable for `TrueLiveRecallReadonlyProofRunner`.

The adapter is internal-only. The proof runner stays responsible for approval and exact query count; the adapter is responsible for binding the runner request to the concrete in-process application path, enforcing proof flags, producing complete counters, and returning runner-safe result objects.

## Execution Flow

Future implementation should use this flow:

1. Reject any request that is not from `internal-true-live-recall-readonly-proof-runner`.
2. Reject if `proofContext.mode !== true_live_recall_readonly_proof`.
3. Reject if `proofContext.exactQueryCount !== 4`.
4. Reject if `readOnly`, `noProvider`, `noAudit`, or `sanitizedOutput` are not exactly `true`.
5. Reject if `includeContent !== false`.
6. Install in-memory instrumentation around the concrete app surfaces listed below.
7. Invoke the existing local search path with:

```text
app.callTool('search_memory', {
  query,
  target,
  limit,
  include_content: false
}, {
  noTokenReadOnly: true,
  executionContext: {
    requestSource: 'internal-true-live-recall-readonly-proof-runner'
  }
})
```

8. Convert the ordinary app result into adapter output before returning to the runner.
9. Restore all wrapped methods in a `finally` block.
10. Return `{ results, sideEffectCounters }` with every required counter key present.

## Counter Source

The adapter must initialize counters from `ZERO_SIDE_EFFECT_COUNTERS` and expose every required key on success and on bounded failure.

The counter source must be explicit instrumentation, not inference from `include_content=false`.

Required wrappers:

| counter | source to wrap | required behavior |
|---|---|---|
| `providerCalls` | `app.recall.externalEmbeddingAdapter.embedBatch()` and `app.recall.externalRerankAdapter.rerank()` | increment and throw proof boundary violation before provider/model/API execution |
| `directJsonlReads` | adapter-owned filesystem access | adapter must perform none; no wrapper should open `.jsonl` or durable memory files |
| `durableMemoryWrites` | `app.services.writeService.record()` plus any known write entrypoint reachable from adapter | increment and throw before write |
| `durableAuditWrites` | `app.recall.recallAuditService.record()` and `recordReadPolicySummary()` | increment and throw before audit append |
| `candidateCacheWrites` | `app.stores.candidateCacheStore.set()` | increment and throw before cache write |
| `candidateCacheFlushes` | `app.stores.candidateCacheStore.flush()`, `clearAll()`, `clearCurrentFingerprint()` | increment and throw before flush/clear |
| `syncCalls` | `app.recall.knowledgeBaseSyncService.syncTarget()` | increment and throw before sync |
| `vectorFlushes` | `app.stores.vectorStore.flush()` | increment and throw before vector flush |
| `embeddingCacheWrites` | `app.stores.vectorStore.getSingleEmbeddingCached()` when called without `readOnly=true`, plus embedding-cache mutation wrappers where practical | increment and throw before cache write path |
| `rawMemoryContentReads` | adapter-owned direct raw store reads | adapter must perform none; ordinary app result raw fields are handled by sanitized adapter output and runner leakage checks |
| `publicMcpExpansion` | adapter-owned public tool/schema mutation | adapter must perform none |

The wrappers should fail closed. If a wrapped forbidden method is reached, the adapter should throw `TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION` with a sanitized reason such as `executor_adapter_provider_call_blocked` or `executor_adapter_audit_write_blocked`.

## Sanitized Adapter Output

The adapter must not return ordinary `search_memory` result objects directly to the runner.

Allowed per-result adapter shape:

```text
memoryId
score
baseScore
rerankScore
target
createdAtDateOnly
updatedAtDateOnly
sourceKinds
matchedTagsCount
coreTagsCount
```

Forbidden adapter output keys:

```text
content
text
title
snippet
rawText
formattedWindow
rawMemoryText
chatHistory
jsonlLine
sourceFile
fullPath
relativePath
filePath
```

The runner will still perform its own raw-leakage scan before final sanitization. This two-layer shape is intentional: the adapter should avoid leaking ordinary search result fields, and the runner should still fail closed if the adapter regresses.

## noProvider / noAudit / readOnly Enforcement

The adapter must treat the proof flags as executable guardrails:

- `readOnly=true` is bound to `requestContext.noTokenReadOnly=true` for `app.callTool('search_memory')`.
- `noProvider=true` is enforced by provider wrappers even if a future config enables remote embedding or rerank.
- `noAudit=true` is enforced by audit wrappers even if a future branch changes read-policy audit behavior.
- `sanitizedOutput=true` is enforced by adapter result projection and runner raw-leakage checks.
- `includeContent=false` is enforced before the concrete search call and after result projection.

If any flag is missing, false, or contradictory, the adapter must throw before calling `app.callTool`.

## No Direct Store Reads

The adapter must not open diary files, SQLite files, vector index files, candidate cache files, audit logs, or `.jsonl` files directly.

The only allowed real-store access path for a future exact-approved execution is the existing in-process `search_memory` application path under the sealed proof context and no-token read-only request context.

## Exact Query Count

The proof runner already enforces `exactQueryCount=4` and ordered query slots `Q1` through `Q4`.

The adapter must still verify that `request.proofContext.exactQueryCount === 4` so a runner or caller regression cannot silently turn the adapter into a broader search helper.

## Day 2 Targeted Tests

Day 2 should add synthetic tests only. No true memory query is needed.

Required tests:

1. Adapter rejects missing or invalid proof context before app call.
2. Adapter rejects `includeContent=true`.
3. Adapter passes `include_content=false` and `noTokenReadOnly=true` to `app.callTool('search_memory')`.
4. Adapter returns complete `sideEffectCounters`.
5. Missing, partial, malformed, unknown-positive, and non-zero counters remain covered by the runner test suite.
6. Adapter blocks provider method attempts and increments/throws before provider execution.
7. Adapter blocks recall audit and read-policy audit attempts.
8. Adapter blocks sync, candidate-cache write/flush, vector flush, and embedding-cache write paths.
9. Adapter result projection removes `content`, `text`, `snippet`, `title`, file paths, raw text, raw chat history, and `.jsonl`-like fields before returning to the runner.
10. Integration-style synthetic test wires `TrueLiveRecallReadonlyProofRunner` to the adapter and proves `exactQueryCount=4`, complete zero counters, sanitized output, and no raw leakage without true live search.
11. Wrapper restoration happens in `finally` after success and after failure.

## CM-0774 Execution Impact

If Day 2 implements this adapter and Day 3 review accepts it, `CM-0774` may move to an execution authorization review. It still must not execute unless the operator supplies the separate exact approval line from `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`.

This plan does not authorize Day 5 execution.

## Remaining Risks

- Current ordinary `search_memory` output shape is not runner-safe by itself because it includes raw-bearing fields.
- Counter trust depends on complete instrumentation coverage. Day 3 must review the concrete adapter implementation, not just the plan.
- The future live proof can at most provide bounded true-live evidence. It still cannot by itself claim `memory recall reliable` unless a later review and truth-table update prove the full gap.

## No-Readiness Wording

This plan does not claim:

- `memory recall reliable`
- `memory write reliable`
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

`RC_NOT_READY_BLOCKED` remains.

Result: `TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_PLAN_COMPLETED_SYNCED_NOT_READY`.
