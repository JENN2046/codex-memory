# True Live Recall Read-Only Execution Surface Gap Plan

Status: `TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_GAP_PLAN_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0775`
Decision: `RC_NOT_READY_BLOCKED`
Scope: gap plan only; no true live `search_memory` execution

## Purpose

This plan records the execution-surface gap discovered after CM-0774. The approval packet can define a future exact true live real-store recall proof, but the current public `search_memory` surface cannot yet prove the required no-provider, no-audit, and read-only side-effect boundary for that proof.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `src/app.js`
- `src/adapters/codex-mcp/http.js`
- `src/adapters/codex-mcp/server.js`
- `src/core/constants.js`
- `src/core/ToolArgumentValidator.js`
- `src/recall/CandidateGenerator.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/recall/RecallAuditService.js`
- `src/recall/RerankService.js`
- `src/recall/ContextVectorManager.js`
- `src/recall/ExternalEmbeddingAdapter.js`
- `src/recall/ExternalRerankAdapter.js`
- `src/storage/VectorIndexStore.js`
- `src/storage/CandidateCacheStore.js`
- targeted search/recall/MCP tests

## Current Surface Findings

The current MCP schema exposes `search_memory` with ordinary recall parameters only:

- `query`
- `target`
- `limit`
- `include_content`
- `context_text`
- `scope`

The schema has `additionalProperties=false`, so an operator cannot pass extra proof controls such as `read_only`, `no_audit`, `no_provider`, `dry_run`, `sanitized_output`, or `exact_query_count`. Any such field would be rejected before it could prove the CM-0774 boundary.

In `src/app.js`, `executeSearchMemory()` derives `readOnly` only from `requestContext.noTokenReadOnly === true`. The current read-only path is therefore transport/context-derived for no-token HTTP requests, not an explicit exact-approved true-live execution mode available through the `search_memory` arguments.

`include_content=false` is insufficient because it controls only whether final result content is included in output. It does not prove:

- no provider/model/API call
- no recall audit write
- no read-policy audit write
- no candidate cache write or cache access mutation
- no embedding cache flush
- no sync or maintenance write
- no durable side-effect counter
- no exact sanitized evidence output shape

## Provider Trigger Paths

Potential provider paths in current source:

- `VectorIndexStore.getSingleEmbeddingCached()` may call `embedTextAdaptive()` when not read-only and a query embedding is missing from cache.
- `VectorIndexStore.embedTextAdaptive()` may call `ExternalEmbeddingAdapter.embedBatch()` when an embedding endpoint is configured.
- `ContextVectorManager.buildQueryContext()` can request query-context embeddings and needs the same read-only/provider boundary if context is supplied.
- `RerankService.rerank()` can call `remoteRerank()` when remote rerank is configured and `options.readOnly !== true`.
- `ExternalRerankAdapter.rerank()` performs a provider HTTP request when configured.

Existing CM-0738 / CM-0739 tests demonstrate no-token HTTP read-only provider suppression in targeted cases. That evidence is useful, but it is not an exact execution surface for a future authorized true-live proof because the MCP tool schema itself does not carry a verifiable provider-disabled assertion.

## Durable Write And Audit Paths

Potential write or side-effect paths in current source:

- `KnowledgeBaseRecallPipeline.search()` may call `knowledgeBaseSyncService.syncTarget()` when not read-only.
- `CandidateGenerator.generate()` may write candidate cache entries when not read-only.
- `CandidateCacheStore.get()` mutates `lastAccessedAt` in memory and stats, and `CandidateCacheStore.set()` flushes durable candidate cache entries.
- `VectorIndexStore.getSingleEmbeddingCached()` may update cached `lastAccessedAt`, write new embedding cache entries, and call `flush()` when not read-only.
- `KnowledgeBaseRecallPipeline.recordAudit()` writes recall audit entries when not read-only.
- `executeSearchMemory()` may call `recallAuditService.recordReadPolicySummary()` when lifecycle read policy is enabled and not read-only.
- `RecallAuditService.record()` and `recordReadPolicySummary()` append recall audit through `AuditLogStore`.

The current no-token HTTP path already sets `requestContext.noTokenReadOnly=true`, and targeted tests assert no local maintenance writes for that path. CM-0774, however, requires a future exact-approved true-live proof through a surface that can be proved read-only without depending on no-token transport context.

## Required Execution Surface

The next minimal implementation should add an explicit internal execution profile for `search_memory` proof mode. Recommended shape:

```text
execution_context:
  mode: true_live_recall_readonly_proof
  read_only: true
  no_provider: true
  no_audit: true
  sanitized_output: true
  exact_query_count: 4
```

If public MCP schema expansion is still considered blocked, this should first be implemented as an internal helper or CLI wrapper rather than a public MCP tool expansion. If it is exposed through `search_memory`, the schema change must be separately reviewed because public MCP expansion remains blocked unless explicitly approved.

Minimum controls:

- `readOnly=true`: skip sync, candidate cache set, vector/embedding cache writes, recall audit, and read-policy audit.
- `noProvider=true`: fail closed before any external embedding or external rerank call; configured providers should not become best-effort fallback.
- `noAudit=true`: fail closed if any recall audit or read-policy audit writer is reached.
- `sanitizedOutput=true`: return only counts, safe metadata keys, score numbers, hash-or-opaque IDs, and error codes.
- `includeContent=false`: still required, but only as one output control among the above controls.
- `exactQueryCount=4`: the proof runner must reject fewer or more than four queries.
- `proofRunId`: a local ephemeral id for evidence correlation that is not written to durable memory or audit.

## Targeted Tests Needed

Recommended minimal test scope for the next implementation:

1. Proof execution rejects missing or partial proof controls.
2. Proof-mode `search_memory` rejects `include_content=true`.
3. Proof-mode rejects query count other than exactly `4`.
4. Proof-mode blocks external embedding provider even when embedding provider config is present.
5. Proof-mode blocks external rerank provider even when rerank provider config is present and query uses rerank directives.
6. Proof-mode does not call `knowledgeBaseSyncService.syncTarget()`.
7. Proof-mode does not call `candidateCacheStore.set()` or flush candidate cache.
8. Proof-mode does not call `vectorStore.flush()` or update embedding cache.
9. Proof-mode does not call `recallAuditService.record()` or `recordReadPolicySummary()`.
10. Proof-mode emits only sanitized evidence shape.
11. Timeout/error path remains bounded and sanitized.
12. Unknown proof controls fail closed.

## Minimal Next Implementation Scope

Recommended smallest file scope:

- `src/core/constants.js` only if the existing public `search_memory` schema is extended.
- `src/core/ToolArgumentValidator.js` only if new nested proof controls need validation beyond existing schema handling.
- `src/app.js` to translate an approved proof execution context into internal `readOnly/noProvider/noAudit/sanitizedOutput` controls.
- `src/recall/KnowledgeBaseRecallPipeline.js` to thread `noAudit` and sanitized proof mode through recall.
- `src/recall/CandidateGenerator.js` and `src/storage/VectorIndexStore.js` to fail closed on `noProvider`.
- `src/recall/RerankService.js` to fail closed on `noProvider`.
- `tests/mcp-contract.test.js`, `tests/mcp-http.test.js`, or a new targeted proof-surface test for the controls above.

If the implementation can avoid public MCP expansion by using an internal exact-approved runner, prefer that route first. Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`, and public schema expansion needs explicit approval if treated as a surface expansion.

## Why CM-0774 Cannot Execute Yet

CM-0774 requires a future true live proof that can demonstrate:

- exactly four queries executed
- sanitized output only
- no raw memory text exposed
- no direct `.jsonl` read
- no provider call
- no durable memory/audit write
- bounded timeout/error reporting

The current `search_memory` tool can request `include_content=false`, but it cannot prove the no-provider/no-audit/read-only boundary as an explicit execution contract. Therefore executing CM-0774 now remains blocked by `BLOCKED_HARD_STOP_REQUIRED`.

## Pass / Fail Labels For Next Phase

Recommended next implementation result labels:

- `TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_IMPLEMENTED_NOT_READY`
- `TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_FAILED_NOT_READY`
- `TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_BLOCKED_SCOPE_DRIFT`
- `BLOCKED_HARD_STOP_REQUIRED`

After that implementation is reviewed, a separate exact approval would still be required before running the true live real-store proof.

## No-Readiness Wording

This plan does not claim:

- `memory recall reliable`
- runtime ready
- RC ready
- production ready
- release ready
- cutover ready
- V8 implemented
- VCP full parity

`RC_NOT_READY_BLOCKED` remains.

Result: `TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_GAP_PLAN_COMPLETED_SYNCED_NOT_READY`.
