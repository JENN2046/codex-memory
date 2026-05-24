# Memory Write Preflight Candidate Source Review

Status: MEMORY_WRITE_PREFLIGHT_CANDIDATE_SOURCE_REVIEW_COMPLETED_NOT_READY
Date: 2026-05-24
Scope: CM-0890 source read-only review of the duplicate/idempotence candidate-source seam behind `MemoryWriteService.writePreflightCandidateProvider`

## Review Input

Reviewed artifacts:

- `src/core/MemoryWriteService.js`
- `src/core/MemoryWriteLifecycleDedupSuppressionPreflight.js`
- `src/storage/SqliteShadowStore.js`
- `tests/memory-write-preflight-runtime-integration.test.js`
- `tests/memory-write-reliability-temp-local-evidence.test.js`
- `docs/MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION_REVIEW.md`
- `docs/MEMORY_WRITE_RELIABILITY_SCOPE_DUPLICATE_POLLUTION_EVIDENCE.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`

This review does not execute true live `record_memory`, true live `search_memory`, provider calls, broad real-memory scans, direct `.jsonl` reads, durable memory/audit writes, public MCP expansion, package/config/watchdog/startup changes, push, release, deploy, cutover, or readiness claims.

## Decision

The next smallest safe write-side seam is no longer the preflight policy itself.

That policy already exists in bounded form and is already wired into `MemoryWriteService` as a default-disabled internal gate. The remaining local gap is the exact candidate-source seam used by `writePreflightCandidateProvider`.

The review conclusion is:

- the next candidate source should live behind one new internal `SqliteShadowStore` helper;
- it should be exact-scope and target-bound from runtime context;
- it should not reuse `listRecords(target)` as a broad target-wide scan surface;
- it should not widen public MCP, public `callTool()`, or unattended runtime behavior;
- it is still not enough to claim `memory write reliable` or `RC_READY`.

## Findings

### 1. The open gap is candidate-source precision, not preflight rule shape

Accepted.

`CM-0836` already proved the lifecycle/dedup/suppression logic in explicit-input fixture form.

`CM-0838` already proved a bounded runtime integration shape:

- `writePreflightEnabled` defaults to `false`;
- `MemoryWriteService.runWritePreflight(...)` already derives:
  - `proposedWrite`
  - `allowedScope`
  - `canonicalHash`
- rejection already happens before diary/shadow/vector/chunk durable projection.

`CM-0839` already narrowed the residual risk to one unresolved area: future real candidate-source review.

### 2. Current duplicate evidence shows idempotence is still open

Accepted.

`CM-0835` temp-local evidence still records current behavior as:

- same synthetic payload accepted twice;
- distinct `memoryId` values created;
- two accepted audit events produced.

So the next write-side value is not more abstract preflight wording. It is a reviewed path for finding exact same-scope existing candidates before projection.

### 3. `MemoryWriteService` already constrains the candidate-provider request shape well

Accepted.

The current runtime request into `writePreflightCandidateProvider` is already bounded to:

- `proposedWrite`
- `allowedScope`
- `canonicalHash`
- `executionContext`

This is the right shape for a future exact-scope source because the duplicate/idempotence decision should be derived from:

- the normalized write payload;
- the runtime-authoritative scope tuple;
- the existing canonical hash logic.

No broader memory search API is needed for this step.

### 4. `SqliteShadowStore` has the needed source fields, but no reviewed exact helper yet

Accepted.

Current `memory_records` already store the fields a duplicate/idempotence candidate source would need:

- `target`
- `title`
- `content`
- `evidence`
- `tags_json`
- `project_id`
- `workspace_id`
- `client_id`
- `task_id`
- `conversation_id`
- `visibility`
- `retention_policy`
- optional lifecycle `status`

However, current reviewed helper surfaces do not yet provide one exact reverse-lookup path for write preflight candidates.

What exists today:

- `listRecords(target)` returns full target-wide record lists ordered by `updated_at`;
- several exact-by-`memoryId` map helpers exist for scope/policy/isolation/governance follow-up;
- no helper currently returns exact-scope write-preflight candidates.

`listRecords(target)` is too broad for the next step because it turns duplicate suppression into a target-wide scan surface instead of a runtime-authoritative exact-scope lookup.

### 5. The next safe helper should stay exact-scope, minimal-field, and internal-only

Accepted.

The next internal helper should do one exact SQL lookup bounded by:

- `target`
- `project_id`
- `workspace_id`
- `client_id`
- `task_id`
- `conversation_id`
- `visibility`
- `retention_policy`

and, when available:

- lifecycle `status`

It should project only the minimum fields needed by `normalizeExistingCandidate(...)` and canonical-hash comparison:

- `memory_id`
- `target`
- `title`
- `content`
- `evidence`
- `tags_json`
- the exact scope tuple
- optional lifecycle `status`

Because canonical hash is already computed by existing shared logic, this helper does not first require a schema change or persisted `canonical_hash` column. The smallest safe implementation can compute hash in-process after exact-scope row selection.

### 6. This should remain one internal helper, not a wiring or readiness step

Accepted.

The next helper should not by itself:

- enable `writePreflightEnabled` in production-like wiring;
- widen public MCP;
- change `record_memory` contract;
- call providers;
- scan real memory broadly;
- claim runtime idempotence closed;
- claim `memory write reliable`;
- claim `RC_READY`.

It should only make the candidate-source seam reviewable and testable.

## Why This Still Cannot Claim Memory Write Reliable

`CM-0890` is source read-only review only.

It does not:

- execute true live `record_memory`;
- wire a real candidate source into a live runtime path;
- prove duplicate suppression against current real store data;
- prove multi-client or long-run idempotence behavior;
- prove rollback/cleanup for accepted writes;
- prove production/default runtime behavior.

Therefore `memory write reliable` remains `exact approval required`, `complete? = no`, and `RC_NOT_READY_BLOCKED`.

## Next Best Gap

The next best local-safe gap is:

`MEMORY_WRITE_PREFLIGHT_EXACT_SCOPE_CANDIDATE_SOURCE_HELPER`

Purpose:

- add one internal `SqliteShadowStore` helper for exact-scope candidate lookup;
- keep the helper minimal-field and target-bound;
- keep canonical-hash computation in existing shared logic;
- validate it with bounded local tests before any future runtime wiring decision.

This is preferable to:

- widening shared governance runtime-entry families further;
- using `listRecords(target)` as a broad scan shortcut;
- jumping directly to a new live write proof.

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_CANDIDATE_SOURCE_REVIEW_COMPLETED_NOT_READY`.

`CM-0890` narrows the write-side duplicate/idempotence gap to one exact next seam: a bounded internal `SqliteShadowStore` candidate-source helper for `MemoryWriteService.writePreflightCandidateProvider`.

No reliability, readiness, release, production, V8, or VCP full-parity claim is made.

`RC_NOT_READY_BLOCKED` remains.
