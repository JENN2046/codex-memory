# CM-0561 Search Memory Cooperative Abort Boundary

Status: CM_0561_COMPLETED_NOT_RECALL_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note records the CM-0561 cooperative abort boundary added after CM-0560.

CM-0560 gave `search_memory` a client-visible timeout JSON-RPC error. CM-0561 narrows the remaining risk that post-timeout recall work can continue into write-like side effects.

It does not claim memory recall reliability, runtime readiness, production readiness, RC readiness, or cutover readiness.

It does not call true live `search_memory`.

It does not read `.jsonl` audit files or real memory content.

It does not run provider calls, broad real memory scans, durable memory writes, durable audit writes, config switches, watchdog/startup changes, migration/import/export/backup/restore apply, public MCP expansion, tag, release, deploy, or cutover.

## What Changed

Changed runtime surface:

```text
src/core/SearchMemoryTimeoutPolicy.js
src/app.js
src/recall/KnowledgeBaseRecallPipeline.js
src/recall/CandidateGenerator.js
```

Changed test surface:

```text
tests/mcp-contract.test.js
```

CM-0561 adds:

- an `AbortController` inside the `search_memory` timeout wrapper
- a propagated `AbortSignal` from app dispatch into passive recall
- cooperative abort checks at app, recall pipeline, and candidate generation boundaries
- a post-timeout guard before read-policy audit summary append
- fixture/mock MCP coverage proving the signal is received and post-timeout read-policy summary append is skipped

## Validation Evidence

Commands run:

```powershell
node --check .\src\core\SearchMemoryTimeoutPolicy.js
node --check .\src\app.js
node --check .\src\recall\KnowledgeBaseRecallPipeline.js
node --check .\src\recall\CandidateGenerator.js
node --check .\tests\mcp-contract.test.js
node --test .\tests\mcp-contract.test.js
node --test .\tests\phase-b-passive-recall.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Observed results:

```text
changed source/test syntax checks: passed
MCP contract tests: 9/9 passed
Phase B passive recall tests: 4/4 passed
npm test: 1603/1603 passed
git diff --check: passed
docs validation: passed
```

The new CM-0561 test uses a mocked `passiveRecallService.search` that waits for `signal.abort` and then resolves after the timeout boundary. It verifies:

- `search_memory` receives an `AbortSignal`
- the returned MCP error remains `SEARCH_MEMORY_TIMEOUT`
- the serialized error does not expose the raw query marker
- `recallAuditService.recordReadPolicySummary` is not called after timeout

## Remaining Limits

CM-0561 is cooperative cancellation, not hard cancellation.

Known remaining limits:

- synchronous CPU work cannot be interrupted mid-loop by this boundary
- lower-level storage and provider adapters do not all consume the signal directly
- an operation that never resolves can still remain pending after the client-visible timeout
- candidate cache, embedding cache, and recall audit side-effect proof still require scoped evidence
- true live `search_memory` validation remains an exact-approval action
- broad real-memory recall proof remains blocked

## Current State

```text
memory write reliable: not claimed
memory recall reliable: not claimed
runtime ready: not claimed
RC ready: not claimed
production ready: not claimed
controlling status: RC_NOT_READY_BLOCKED
```

## Next Safe Action

Continue Phase 1 Foundation Reliability by preparing an exact-approval packet for bounded authorized write-path validation and bounded recall validation, or by adding further fixture-only side-effect isolation tests for candidate cache and recall audit boundaries.

Do not execute true live write or recall validation without exact approval.
