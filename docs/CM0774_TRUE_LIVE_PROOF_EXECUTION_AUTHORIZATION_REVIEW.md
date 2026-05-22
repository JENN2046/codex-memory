# CM0774 True Live Proof Execution Authorization Review

Status: `CM0774_TRUE_LIVE_PROOF_EXECUTION_AUTHORIZATION_REVIEW_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0784`
Decision: `RC_NOT_READY_BLOCKED`
Scope: exact execution authorization review only; no true live proof execution

## Purpose

This review prepares the exact authorization boundary for a future one-time `CM-0774` true live real-store recall proof.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, does not change package/config/watchdog/startup behavior, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `docs/TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_REVIEW.md`
- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `src/core/TrueLiveRecallExecutorAdapter.js`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Authorization Decision

Decision: exact authorization package is prepared for a future execution; execution remains blocked until the operator supplies the exact approval line below on a fresh synced main head.

Day 5 may execute only if every condition in this review still holds at execution time. If any condition is missing, stale, contradicted by current Git state, or broadened by the operator request, the future execution must fail closed as `TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_SCOPE_DRIFT` or `TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_BOUNDARY`.

This review does not itself authorize execution.

## Exact Approval Line

The future operator approval must match this line exactly after whitespace normalization:

```text
I approve MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION_ONCE for codex-memory at the current synced main head, limited to exactly four read-only true live search_memory calls against the current local codex-memory real store, using the query-family and output boundaries in docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md, with no provider call, no direct .jsonl read, no durable memory/audit write, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness claim.
```

Any missing, edited, paraphrased, bundled, broader, narrower-but-ambiguous, or stale approval must fail closed before the runner executes.

## Exact Query Set

If the future execution is separately exact-approved, it must use exactly these four ordered queries:

| slot | family | literal query text |
|---|---|---|
| `Q1` | current project status / mainline memory spine state | `current project status mainline memory spine state` |
| `Q2` | memory recall evidence ladder / bounded evidence progression | `memory recall evidence ladder bounded evidence progression` |
| `Q3` | blocker / not-ready / no-overclaim status | `blocker not-ready no-overclaim status` |
| `Q4` | deliberately unlikely negative-control phrase selected by the operator | `negative-control-zeta-7194-nonexistent-memory-spine-token` |

The query count must be exactly `4`. The ordered slots must be exactly `Q1`, `Q2`, `Q3`, `Q4`. No broad query, wildcard query, `search_all_knowledge_bases=true`, `.jsonl`, `raw memory`, raw chat-history, export, dump, or broad-scan query is allowed.

## Required Execution Shape

The future execution must use:

- `TrueLiveRecallReadonlyProofRunner`
- `createTrueLiveRecallExecutorAdapter({ app })`
- `target=both`
- `limit=5`
- `includeContent=false`
- `readOnly=true`
- `noProvider=true`
- `noAudit=true`
- `sanitizedOutput=true`
- `exactQueryCount=4`
- current local codex-memory real store through the existing in-process `search_memory` application path only

The adapter must continue to call:

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

No public MCP schema expansion or public proof-mode argument is allowed.

## Allowed Output Shape

The future execution output may contain only sanitized evidence:

```text
taskId
baselineCommit
proofRunId
queryCount
queryFamiliesUsed:
  slot
  family
proofContext:
  mode
  approvalPacket
  exactApprovalRequired
  exactQueryCount
  readOnly
  noProvider
  noAudit
  sanitizedOutput
  includeContent
perQuery:
  querySlot
  queryFamily
  elapsedMs
  resultCount
  topResultIdHashOrStableOpaqueId
  topResultScoreIfAvailable
  matchedMetadataKeysOnly
  rawContentReturned=false
  errorCodeIfAny
  sideEffectCounters
sideEffectCounters
rawContentReturned=false
directJsonlRead=false
durableMemoryWrite=false
durableAuditWrite=false
publicMcpExpanded=false
memoryRecallReliableClaimed=false
rcNotReadyBlocked=true
decision
```

The full `sideEffectCounters` object must include every key currently required by `ZERO_SIDE_EFFECT_COUNTERS`:

- `providerCalls=0`
- `directJsonlReads=0`
- `durableMemoryWrites=0`
- `durableAuditWrites=0`
- `candidateCacheWrites=0`
- `candidateCacheFlushes=0`
- `syncCalls=0`
- `vectorFlushes=0`
- `embeddingCacheWrites=0`
- `rawMemoryContentReads=0`
- `publicMcpExpansion=0`

Missing, partial, malformed, non-finite, negative, required non-zero, or unknown-positive counters must fail closed.

## Forbidden Output

The future execution must not print or persist:

- raw memory text
- raw chat history
- raw `.jsonl` lines
- raw `content`
- raw `text`
- raw `title`
- raw `snippet`
- raw file paths
- secrets, tokens, env values, private keys, auth headers, cookies, or provider credentials
- broad result dumps
- screenshots or transcripts containing raw memory content

If any raw content appears in executor output, the runner must fail closed before sanitization and the closeout must report only sanitized leakage metadata.

## Execution Preconditions

Before any future execution, the operator or automation must freshly verify:

- local branch is `main`
- worktree is clean
- local `HEAD`, local `origin/main`, and remote `refs/heads/main` are equal
- the exact approval line above was supplied for this execution and not reused from a stale baseline
- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md` is present
- `docs/TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_REVIEW.md` is present
- no package/lockfile/config/watchdog/startup drift occurred after this review that affects the proof boundary
- no public MCP expansion occurred
- no provider/model/API call is required
- no direct `.jsonl` or durable memory file read is required
- no durable memory/audit write is required
- no migration/import/export/backup/restore apply is required

If any precondition fails, do not execute.

## Future Result Labels

Allowed future execution labels:

- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY`
- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_FAILED_NOT_READY`
- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_BOUNDARY`
- `TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_SCOPE_DRIFT`

Even `TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY` cannot claim `memory recall reliable`. A separate later evidence review and truth-table update would still be required.

## No-Readiness Wording

This review does not claim:

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

Result: `CM0774_TRUE_LIVE_PROOF_EXECUTION_AUTHORIZATION_REVIEW_COMPLETED_SYNCED_NOT_READY`.
