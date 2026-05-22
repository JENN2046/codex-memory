# True Live Recall Internal Proof Runner Plan

Status: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PLAN_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0776`
Decision: `RC_NOT_READY_BLOCKED`
Scope: internal runner plan only; no true live proof execution

## Purpose

This plan defines the next minimal internal execution surface needed before CM-0774 can run. It designs an exact-approved true live recall proof runner that can enforce and verify `readOnly`, `noProvider`, `noAudit`, `sanitizedOutput`, and `exactQueryCount=4` without expanding the public MCP schema.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `docs/TRUE_LIVE_RECALL_READONLY_EXECUTION_SURFACE_GAP_PLAN.md`
- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `src/app.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/recall/CandidateGenerator.js`
- `src/recall/ContextVectorManager.js`
- `src/recall/RerankService.js`
- `src/storage/VectorIndexStore.js`
- `src/storage/CandidateCacheStore.js`
- `src/adapters/codex-mcp/http.js`
- `src/adapters/codex-mcp/server.js`

## Runner Entry Point

The next implementation should add an internal runner, not a new public MCP tool and not a public `search_memory` schema expansion.

Recommended internal shape:

```text
src/core/TrueLiveRecallReadonlyProofRunner.js
src/cli/true-live-recall-readonly-proof-runner.js
```

The CLI should be an operator-only wrapper around the internal helper. It should require an explicit approval token or exact approval line supplied at invocation time, validate it against the CM-0774 approval packet, and then call the existing internal recall path with a sealed proof context.

The public MCP tool list must remain:

- `record_memory`
- `search_memory`
- `memory_overview`

No public MCP argument schema should be changed by this runner plan.

## Required Proof Context

The runner must construct a sealed internal execution context:

```text
proofContext:
  mode: true_live_recall_readonly_proof
  approvalPacket: CM-0774
  exactApprovalRequired: true
  exactQueryCount: 4
  readOnly: true
  noProvider: true
  noAudit: true
  sanitizedOutput: true
  includeContent: false
```

The context must be created by the runner and not accepted from untrusted public MCP arguments. Any missing, partial, contradictory, or caller-provided override must fail closed before recall execution.

## Exact Approval Requirement

Execution remains blocked until a future user message supplies the exact approval for the execution task. The runner implementation should only prepare the machinery.

The runner must verify:

- CM-0774 packet exists at the current synced baseline.
- The supplied approval line exactly authorizes the internal runner execution, not broad `search_memory`.
- Worktree and branch state are clean and current before execution.
- Query families match the CM-0774 packet.
- Exactly four queries are supplied.
- The execution result label remains not-ready even if the proof passes.

This plan is not that approval.

## Enforcement Rules

### exactQueryCount=4

The runner must reject:

- zero queries
- one to three queries
- more than four queries
- generated or expanded query lists
- broad scan requests
- wildcard or export-style requests

The runner should record only query slots and families in evidence, not raw private memory results.

### readOnly=true

`readOnly=true` must be threaded through `executeSearchMemory()` / `passiveRecallService.search()` / `KnowledgeBaseRecallPipeline.search()` / `CandidateGenerator.generate()` / `ContextVectorManager.buildQueryContext()` / `RerankService.rerank()` / `VectorIndexStore.getSingleEmbeddingCached()`.

The runner must fail if any of these paths attempts:

- `knowledgeBaseSyncService.syncTarget()`
- `candidateCacheStore.set()`
- candidate cache flush
- `vectorStore.flush()`
- embedding cache write
- `recallAuditService.record()`
- `recallAuditService.recordReadPolicySummary()`
- durable memory write
- durable audit write

### noProvider=true

The runner must fail closed before any external embedding or rerank provider can be called. Existing `readOnly=true` already suppresses current provider paths in targeted code paths, but the runner should add explicit `noProvider=true` assertion and counters so this is evidence, not inference.

The blocked provider surfaces include:

- `ExternalEmbeddingAdapter.embedBatch()`
- `ExternalRerankAdapter.rerank()`
- any model/API provider route reachable through embedding or rerank config

### noAudit=true

The runner must fail if recall audit or read-policy audit writers are reached. This should be separate from `readOnly=true` so the proof can show audit suppression directly.

Blocked audit surfaces include:

- `KnowledgeBaseRecallPipeline.recordAudit()`
- `RecallAuditService.record()`
- `RecallAuditService.recordReadPolicySummary()`
- `AuditLogStore` append paths invoked by recall audit

### sanitizedOutput=true

The runner must return only sanitized evidence:

- task id
- baseline commit
- proof run id
- query count
- query family labels
- elapsed time
- result count
- top result opaque id or hash
- score numbers where available
- safe metadata key names only
- boolean side-effect counters
- bounded error codes

Forbidden output:

- raw memory text
- raw chat history
- raw `.jsonl` lines
- `content`
- `text`
- `snippet`
- full titles if they may expose private memory
- file paths outside safe metadata policy
- secrets, tokens, env values, auth headers, cookies, provider credentials

This matters because current `include_content=false` does not remove every text-bearing result field from the internal aggregate result shape. The runner must sanitize after recall and must assert that raw text fields are absent from emitted evidence.

## No Direct Store Reads

The runner must not read real memory files, diary files, `.jsonl`, audit logs, SQLite files, vector index files, or cache files directly. It may only invoke the internal recall service path under the sealed proof context after future exact approval.

## Timeout And Error Handling

The runner must use the existing bounded search timeout behavior and emit sanitized error evidence only:

- `SEARCH_MEMORY_TIMEOUT` or the current bounded equivalent for timeout.
- provider-block violation as a failed proof boundary.
- audit-write attempt as a failed proof boundary.
- durable-write attempt as a failed proof boundary.
- raw-output leakage as a failed proof boundary.

A timeout is not a pass. It should be recorded as failed-not-ready or blocked-boundary evidence depending on where it occurs.

## Required Targeted Tests

The next implementation should add targeted tests that prove:

1. Runner rejects missing exact approval.
2. Runner rejects non-exact or broader approval text.
3. Runner rejects query count other than exactly `4`.
4. Runner rejects public MCP schema expansion as an implementation dependency.
5. Runner forces `includeContent=false`.
6. Runner forces `readOnly=true` into app, pipeline, candidate, context-vector, rerank, and vector paths.
7. Runner blocks `knowledgeBaseSyncService.syncTarget()`.
8. Runner blocks `candidateCacheStore.set()` and candidate cache flush.
9. Runner blocks `vectorStore.flush()` and embedding cache writes.
10. Runner blocks `ExternalEmbeddingAdapter.embedBatch()` even when configured.
11. Runner blocks `ExternalRerankAdapter.rerank()` even when rerank directives are present.
12. Runner blocks `recallAuditService.record()`.
13. Runner blocks `recordReadPolicySummary()`.
14. Runner emits no raw `content`, `text`, or `snippet`.
15. Runner emits sanitized counts, booleans, opaque ids, and bounded errors only.
16. Timeout/error path remains bounded and sanitized.
17. Side-effect counters remain zero for provider, direct `.jsonl` read, durable memory write, durable audit write, cache write, sync, and vector flush.

## Implementation File Scope

Recommended smallest future implementation scope:

- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `src/cli/true-live-recall-readonly-proof-runner.js`
- `src/app.js` to expose an internal-only execution helper or context path without changing public MCP schema
- `src/recall/KnowledgeBaseRecallPipeline.js` to accept `noAudit` / proof context and fail closed on audit attempts
- `src/recall/CandidateGenerator.js` to support proof counters and cache-write fail-closed assertions
- `src/storage/VectorIndexStore.js` to support `noProvider` / no-flush proof assertions
- `src/recall/RerankService.js` to support `noProvider` proof assertions
- targeted tests under `tests/true-live-recall-readonly-proof-runner*.test.js`

Avoid `src/core/constants.js` public schema changes unless a separate task explicitly approves public MCP schema expansion. Public MCP expansion remains blocked in this plan.

## Why CM-0774 Still Cannot Execute Yet

CM-0774 defines a future exact proof packet, and CM-0775 identified the execution-surface gap. This CM-0776 plan defines the internal runner design, but the runner is not implemented yet.

Therefore CM-0774 still cannot execute because there is no implemented surface that can currently prove all of:

- exact query count `4`
- `readOnly=true`
- `noProvider=true`
- `noAudit=true`
- `sanitizedOutput=true`
- no raw memory text output
- no direct `.jsonl` read
- no durable memory/audit write
- no cache/sync/vector flush side effects
- bounded timeout/error evidence

## Next Phase Labels

Recommended next implementation result labels:

- `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_IMPLEMENTED_NOT_READY`
- `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_FAILED_NOT_READY`
- `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_BLOCKED_SCOPE_DRIFT`
- `BLOCKED_HARD_STOP_REQUIRED`

After implementation and review, a separate exact approval would still be required before any true live real-store proof run.

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

Result: `TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PLAN_COMPLETED_SYNCED_NOT_READY`.
