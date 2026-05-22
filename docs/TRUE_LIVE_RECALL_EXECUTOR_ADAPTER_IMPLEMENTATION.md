# True Live Recall Executor Adapter Implementation

Status: `TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_IMPLEMENTED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0782`
Decision: `RC_NOT_READY_BLOCKED`
Scope: minimal internal executor adapter/wrapper implementation and targeted synthetic tests only

## Purpose

This implementation adds the concrete internal executor adapter/wrapper planned in `CM-0781`.

The adapter gives `TrueLiveRecallReadonlyProofRunner` a reviewed internal `searchExecutor` shape without expanding public MCP tools or changing public `search_memory` schema. It is still synthetic-test validated only in this slice and does not execute the `CM-0774` true live real-store proof.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, does not change package/config/watchdog/startup behavior, and does not claim `memory recall reliable`.

## Implemented Files

- `src/core/TrueLiveRecallExecutorAdapter.js`
- `tests/true-live-recall-executor-adapter.test.js`

No public MCP schema file, package manifest, lockfile, config, watchdog, startup script, or CLI entrypoint was changed.

## Implemented Adapter Boundary

The adapter exports:

```text
createTrueLiveRecallExecutorAdapter({ app })
```

The returned function is a `searchExecutor(request)` compatible with `TrueLiveRecallReadonlyProofRunner`.

The adapter rejects requests before app execution unless all proof fields are exact:

- `source=internal-true-live-recall-readonly-proof-runner`
- `proofContext.mode=true_live_recall_readonly_proof`
- `proofContext.exactQueryCount=4`
- `readOnly=true`
- `noProvider=true`
- `noAudit=true`
- `sanitizedOutput=true`
- `includeContent=false`

The adapter then calls the existing in-process app path:

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

This keeps the adapter internal and avoids public MCP expansion.

## Complete Counter Source

The adapter initializes every key from `ZERO_SIDE_EFFECT_COUNTERS` and returns a complete `sideEffectCounters` object on successful synthetic execution.

The counter source is in-memory instrumentation around current app surfaces:

| counter | guarded surface |
|---|---|
| `providerCalls` | `externalEmbeddingAdapter.embedBatch()`, `externalRerankAdapter.rerank()` |
| `durableMemoryWrites` | `writeService.record()` |
| `durableAuditWrites` | `recallAuditService.record()`, `recordReadPolicySummary()`, `auditLogStore.appendWriteAudit()`, `appendRecallAudit()` |
| `candidateCacheWrites` | `candidateCacheStore.set()` |
| `candidateCacheFlushes` | `candidateCacheStore.flush()`, `clearAll()`, `clearCurrentFingerprint()` |
| `syncCalls` | `knowledgeBaseSyncService.syncTarget()` |
| `vectorFlushes` | `vectorStore.flush()` |
| `embeddingCacheWrites` | `vectorStore.getSingleEmbeddingCached()` when called without `readOnly=true` |
| `directJsonlReads` | no adapter-owned direct file read path |
| `rawMemoryContentReads` | no adapter-owned direct raw store read path |
| `publicMcpExpansion` | no adapter-owned public tool/schema mutation path |

If a guarded forbidden surface is touched, the wrapper increments the relevant counter and throws `TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION` before the original method executes.

Wrappers are restored in `finally` after both success and failure.

## Sanitized Adapter Output

The adapter does not return ordinary app `search_memory` results directly.

It projects each result into runner-safe fields:

- `memoryId`
- `score`
- `baseScore`
- `rerankScore`
- `target`
- `createdAtDateOnly`
- `updatedAtDateOnly`
- `sourceKinds`
- `matchedTagsCount`
- `coreTagsCount`

Forbidden result keys are not returned:

- `content`
- `text`
- `title`
- `snippet`
- `rawText`
- `formattedWindow`
- `rawMemoryText`
- `chatHistory`
- `jsonlLine`
- `sourceFile`
- `fullPath`
- `relativePath`
- `filePath`

The runner still performs its own raw executor leakage check before final sanitization.

## Targeted Validation

Passed:

```text
node --check src\core\TrueLiveRecallExecutorAdapter.js
node --check tests\true-live-recall-executor-adapter.test.js
node --test tests\true-live-recall-executor-adapter.test.js
node --test tests\true-live-recall-internal-proof-runner.test.js
```

Targeted test results:

- executor adapter: `5/5`
- internal proof runner regression: `6/6`

Coverage:

- invalid proof context rejected before app call
- `includeContent=true` rejected before app call
- `app.callTool('search_memory')` receives `include_content=false`
- request context receives `noTokenReadOnly=true`
- adapter emits complete zero side-effect counters
- adapter removes raw `content`, `text`, `snippet`, `title`, file path, and `.jsonl`-like fields
- provider surfaces fail closed before execution
- durable memory write surface fails closed before execution
- recall audit and read-policy audit surfaces fail closed before execution
- sync, candidate-cache write/flush, vector flush, and embedding-cache write surfaces fail closed before execution
- wrappers restore after success and after failure
- `TrueLiveRecallReadonlyProofRunner` can consume the adapter with exactly four synthetic queries without raw leakage

## Changed-Scope Re-Review

No actionable findings in the changed scope after implementation and targeted validation.

Re-review checks:

- no public MCP schema/tool expansion
- no package or lockfile change
- no config/watchdog/startup change
- no provider/model/API call
- no direct `.jsonl` or durable memory content read
- no durable memory/audit write
- no true live `search_memory` or `record_memory`
- no readiness claim
- wrappers restore via `finally`
- ordinary app result raw fields are projected before reaching the runner

Remaining review need: Day 3 must still review this adapter/wrapper before any CM-0774 execution authorization review.

## CM-0774 Execution Impact

This implementation is a prerequisite for the Day 3 adapter review. It does not execute or authorize `CM-0774`.

`CM-0774` still requires:

- Day 3 adapter/wrapper review result
- separate exact execution authorization review
- the separate exact approval line from `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- current clean/synced Git state at execution time
- no readiness claim even if the future proof passes

## No-Readiness Wording

This implementation does not claim:

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

Result: `TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_IMPLEMENTED_SYNCED_NOT_READY`.
