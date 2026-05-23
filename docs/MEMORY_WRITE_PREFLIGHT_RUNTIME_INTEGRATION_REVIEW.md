# Memory Write Preflight Runtime Integration Review

Status: MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION_REVIEW_COMPLETED_NOT_READY
Date: 2026-05-23
Scope: CM-0839 review of CM-0838 bounded runtime integration

## Review Input

Reviewed artifacts:

- `src/core/MemoryWriteService.js`
- `src/core/MemoryWriteLifecycleDedupSuppressionPreflight.js`
- `tests/memory-write-preflight-runtime-integration.test.js`
- `docs/MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `.agent_board/VALIDATION_LOG.md`

This review does not execute true live `record_memory`, true live `search_memory`, provider calls, broad real-memory scans, direct `.jsonl` reads, durable memory/audit writes, public MCP expansion, migration/import/export/backup/restore apply, package/config/watchdog/startup changes, push, release, deploy, cutover, or readiness claims.

## Decision

CM-0838 is accepted as a bounded internal runtime integration layer for future write reliability work.

It is sufficient to proceed to the next non-live write-side tasks:

- rollback / cleanup posture review for rejected preflight writes and accepted writes.
- lifecycle / scope runtime governance review for proposal, approval, supersession, tombstone, forget, quarantine, and stale-memory behavior.
- candidate-provider source design, still bounded and exact-scope only.
- separately exact-approved live write proof packet or execution only after the above boundaries remain stable.

It is not sufficient to claim `memory write reliable`, default unattended write reliability, production behavior, long-run durability, or `RC_READY`.

## Findings

### 1. Default-Disabled Runtime Gate

Accepted.

`MemoryWriteService` now defaults `writePreflightEnabled` to `false`. Existing construction paths that do not pass the new options preserve current behavior. The targeted test `CM-0838 keeps write preflight default-disabled and preserves current write path` verifies that the candidate provider is not called and diary/shadow/vector/chunk/audit projection proceeds as before.

Residual risk: future wiring could enable this gate in production-like paths without enough candidate-source review. That remains a separate integration/wiring decision and should not be implicit.

### 2. Write-Path Placement

Accepted.

The gate runs after existing authorization, schema metadata rejection, target/title/content/evidence validation, secret scanning, sensitivity handling, knowledge validation, and process validation. It runs before `createdAt`, memory id generation, diary write, SQLite shadow upsert, vector upsert, and chunk indexing.

This is the right placement for duplicate, scope, lifecycle, and pollution preflight because rejection prevents durable projection while preserving existing input safety checks.

### 3. Candidate Boundary

Accepted as bounded, not complete.

The integration only uses an injected `writePreflightCandidateProvider`. The request shape is bounded to proposed write, allowed scope, canonical hash, and execution context. The tests verify the canonical hash and scope are passed.

This is not yet a reviewed real candidate source. It does not prove that a future candidate provider will avoid broad scans, raw memory exposure, provider calls, or stale summaries. Future implementation must prove the candidate source separately.

### 4. Fail-Closed Behavior

Accepted for the bounded integration layer.

Tests cover:

- active duplicate rejection before durable projection.
- runtime-context scope overriding payload scope for allowed boundary.
- payload scope drift rejection before durable projection.
- candidate provider throw fail-closed before durable projection.
- lifecycle action rejection without internal exact approval before durable projection.

The integration also fails closed on malformed candidate-provider return.

Review note: malformed candidate-provider return is implemented but should receive a dedicated targeted assertion before any future real candidate source is wired.

### 5. Exact Approval Boundary

Accepted.

Lifecycle exact approval is read from internal `executionContext.writePreflightExactApproval` or `executionContext.exactApproval`, not from arbitrary payload fields. This preserves the exact-approval-only rule for supersession, tombstone, and forget-like actions.

This does not yet implement lifecycle transitions. It only prevents lifecycle-action writes from slipping through this preflight gate without an internal exact-approval signal.

### 6. Audit Behavior

Accepted as normal write-audit behavior, not durable reliability proof.

Rejected preflight results use `buildRejectedResult()` and `writeAudit()`. This keeps preflight rejection visible through the existing write audit surface.

This review does not read real audit content or prove long-run durable audit reliability. It only confirms that the integration calls the same rejected-audit path used by other runtime rejections.

## Why This Still Cannot Claim Memory Write Reliable

CM-0838 remains bounded evidence because:

- no true live `record_memory` was executed.
- no real memory store was scanned.
- no real candidate source was reviewed or wired.
- no real `.jsonl` or durable memory content was read.
- no provider/API call was made.
- no accepted live write, rollback cleanup, or long-run durability behavior was proven.
- duplicate suppression was proven only with injected synthetic candidate summaries.
- lifecycle actions are gated, not implemented as durable lifecycle transitions.
- production behavior and multi-client behavior remain unproven.

Therefore `memory write reliable` remains `exact approval required`, `complete? = no`, and `RC_NOT_READY_BLOCKED`.

## Next Best Gap

The next best non-live gap is:

`MEMORY_WRITE_ROLLBACK_CLEANUP_POSTURE_REVIEW`

Purpose:

- Review what happens after accepted writes, rejected writes, and preflight-rejected writes.
- Define rollback/cleanup expectations for diary, SQLite shadow, vector index, chunk index, reconcile tasks, and write audit.
- Keep real cleanup/apply hard-gated.
- Determine what bounded fixture/temp-local evidence is needed before any exactly-one live write proof.

Parallel governance preparation:

`MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_PLAN`

Purpose:

- Convert proposal / approval / supersession / tombstone / forget / quarantine / stale-memory concepts into runtime boundaries.
- Define user/project/agent/task/client/workspace scope rules.
- Prove inactive, rejected, tombstoned, superseded, stale, or out-of-scope memory cannot pollute recall by default.

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION_REVIEW_COMPLETED_NOT_READY`.

CM-0838 is accepted as bounded runtime integration evidence and as a valid base for the next rollback/cleanup and governance planning/review tasks.

No reliability, readiness, release, production, V8, or VCP full-parity claim is made.

`RC_NOT_READY_BLOCKED` remains.
