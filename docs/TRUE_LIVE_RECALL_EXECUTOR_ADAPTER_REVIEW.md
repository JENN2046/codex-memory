# True Live Recall Executor Adapter Review

Status: `TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_REVIEW_COMPLETED_SYNCED_NOT_READY`
Date: 2026-05-22
Task: `CM-0783`
Decision: `RC_NOT_READY_BLOCKED`
Scope: review of the CM-0782 internal executor adapter/wrapper only; no true live proof execution

## Purpose

This review checks whether `CM-0782` gives `TrueLiveRecallReadonlyProofRunner` a concrete internal executor adapter that can support a future separately exact-approved `CM-0774` execution authorization review.

This slice does not execute true live `search_memory`, does not execute true live `record_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory files, does not call providers, does not write durable memory or audit state, does not expand public MCP, does not change package/config/watchdog/startup behavior, and does not claim `memory recall reliable`.

## Inputs Reviewed

- `src/core/TrueLiveRecallExecutorAdapter.js`
- `tests/true-live-recall-executor-adapter.test.js`
- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `tests/true-live-recall-internal-proof-runner.test.js`
- `docs/TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_IMPLEMENTATION.md`
- `docs/TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_PLAN.md`
- `docs/TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER_PATCH_REVIEW.md`
- `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Review Findings

### Internal-Only Placement

Accepted.

The adapter is implemented as `src/core/TrueLiveRecallExecutorAdapter.js` and exposes `createTrueLiveRecallExecutorAdapter({ app })`. It does not add a public MCP tool, does not expand the public `search_memory` schema, does not add a CLI entrypoint, and does not change package, lockfile, config, watchdog, or startup surfaces.

### Proof Request Binding

Accepted.

The adapter rejects before `app.callTool` unless the request is from `internal-true-live-recall-readonly-proof-runner`, includes a sealed proof context with `mode=true_live_recall_readonly_proof`, `exactQueryCount=4`, `readOnly=true`, `noProvider=true`, `noAudit=true`, `sanitizedOutput=true`, and `includeContent=false`, and repeats the same request flags at the adapter boundary.

This makes the adapter unsuitable as a general helper and keeps it bound to the internal runner proof context.

### Concrete Search Path

Accepted.

The adapter invokes the existing in-process application path:

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

This is the intended non-public path for a future proof. It keeps `readOnly` tied to the application path's `noTokenReadOnly` handling and avoids direct store or `.jsonl` file access inside the adapter.

### Side-Effect Counter Source

Accepted for the reviewed adapter surface.

The adapter initializes every key from `ZERO_SIDE_EFFECT_COUNTERS` and returns a complete `sideEffectCounters` object on success. It instruments current provider, durable write, recall/read-policy audit, audit append, sync, candidate-cache write/flush, vector flush, and embedding-cache write surfaces. Touching a guarded surface increments the matching counter and throws `TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION` before the original method executes.

The runner still independently rejects missing, partial, malformed, non-finite, negative, unknown-positive, and required non-zero counters.

### Sanitized Output

Accepted.

The adapter does not return ordinary `search_memory` results directly. It projects each result to a runner-safe shape containing ids/scores/date-only metadata/source-kind/tag counts only, and omits raw-bearing fields including `content`, `text`, `title`, `snippet`, `rawText`, `formattedWindow`, `rawMemoryText`, `chatHistory`, `jsonlLine`, and path-like fields.

The runner remains a second boundary: if a future adapter regression returns raw executor fields, `TrueLiveRecallReadonlyProofRunner` fails closed before final sanitization.

### Timeout / Signal Boundary

Accepted with a review note.

The runner passes an abort `signal` into the adapter request. The adapter does not forward that specific signal into `app.callTool`, but the current `app.callTool('search_memory')` path creates its own bounded timeout signal and passes it into `executeSearchMemory()` and the recall pipeline. Source review therefore does not block the adapter for the default proof path.

Future CM-0774 authorization should not customize timeout behavior without a fresh adapter review, because divergent outer/inner timeout values could make timeout evidence harder to interpret.

### Targeted Test Coverage

Accepted.

The adapter tests cover the core reviewed risks:

- invalid proof context rejected before app call
- contradictory `includeContent=true` rejected before app call
- `app.callTool('search_memory')` receives `include_content=false`
- request context receives `noTokenReadOnly=true`
- complete zero side-effect counters returned on success
- raw ordinary result fields are not emitted by adapter output
- provider, durable write, audit, sync, cache, vector flush, and embedding-cache write surfaces fail closed before original execution
- wrappers restore after success and failure
- the proof runner can consume the adapter with exactly four synthetic queries and no raw leakage

Validation remains adapter `5/5` and runner regression `6/6`.

## Remaining Gap

This review accepts the adapter as sufficient to proceed to Day 4 `CM0774_TRUE_LIVE_PROOF_EXECUTION_AUTHORIZATION_REVIEW`.

It does not execute `CM-0774`, does not approve future execution by itself, and does not prove real-store recall reliability. The future execution still requires a separate exact approval line, current clean/synced Git state, exactly four queries, sanitized output only, and the same no-provider/no-audit/no-direct-`.jsonl`/no-durable-write/no-readiness boundary.

## CM-0774 Execution Decision

Decision: adapter review completed; proceed to a future execution authorization review, not execution.

The adapter can support a later CM-0774 execution path only if all of the following remain true at execution time:

- the operator supplies the separate exact approval line from `docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md`
- local `HEAD`, `origin/main`, and remote `refs/heads/main` are freshly checked and synced
- worktree is clean
- the runner uses exactly four ordered query slots
- the adapter remains internal-only and uses `app.callTool('search_memory')` with `include_content=false` and `noTokenReadOnly=true`
- provider calls, direct `.jsonl` reads, durable memory/audit writes, public MCP expansion, package/config/watchdog/startup changes, migration/import/export/backup/restore apply, and readiness claims remain blocked

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

Result: `TRUE_LIVE_RECALL_EXECUTOR_ADAPTER_REVIEW_COMPLETED_SYNCED_NOT_READY`.
