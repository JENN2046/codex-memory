# Memory Write Preflight Exact-Scope Candidate Source Helper

Status: MEMORY_WRITE_PREFLIGHT_EXACT_SCOPE_CANDIDATE_SOURCE_HELPER_COMPLETED_NOT_READY
Date: 2026-05-24
Scope: CM-0891 bounded internal helper/test/docs slice for write-side duplicate/idempotence candidate lookup

## What Changed

Implemented:

- `src/storage/SqliteShadowStore.js`
  - added `getWritePreflightCandidates({ target, allowedScope, limit })`
- `tests/memory-write-preflight-candidate-source-helper.test.js`

This slice follows CM-0890 exactly:

- the next seam is one internal `SqliteShadowStore` helper;
- canonical-hash computation remains in existing shared preflight logic;
- public MCP and runtime wiring remain unchanged.

## Helper Shape

The new helper is exact-scope and target-bound.

It:

- requires `target` to be `process` or `knowledge`;
- filters by exact runtime scope tuple:
  - `projectId`
  - `workspaceId`
  - `clientId`
  - `taskId`
  - `conversationId`
  - `visibility`
  - `retentionPolicy`
- treats missing scope values as exact null/empty-column matches;
- returns only the minimal fields needed by existing write-preflight normalization:
  - `memoryId`
  - `target`
  - `title`
  - `content`
  - `evidence`
  - `tags`
  - exact scope tuple
  - optional `lifecycleStatus`

It does not:

- persist `canonical_hash`;
- enable runtime preflight by default;
- wire itself into public `record_memory`;
- widen public `callTool()`;
- scan broad target-wide record sets through `listRecords(target)`.

## Validation

Targeted validation:

```text
node --check src\storage\SqliteShadowStore.js
node --check tests\memory-write-preflight-candidate-source-helper.test.js
node --test tests\memory-write-preflight-candidate-source-helper.test.js
```

Observed result:

```text
3/3 tests passed
```

Covered behavior:

| Case | Evidence | Limit |
|---|---|---|
| Exact-scope helper filtering | returns only same-target, same-scope candidates; excludes different target/task/visibility rows | synthetic temp-local store only |
| Runtime-preflight duplicate suppression | helper can back `MemoryWriteService.writePreflightCandidateProvider` and reject same-scope duplicates before durable projection | isolated harness only |
| Out-of-scope duplicate non-suppression | same-content out-of-scope record is ignored and accepted write path is preserved | not app-level wiring |

## Why This Still Cannot Claim Memory Write Reliable

CM-0891 is bounded internal helper evidence only.

It does not prove:

- app/runtime wiring on current default application path;
- unattended duplicate suppression in current runtime;
- true live `record_memory` duplicate handling;
- multi-client or long-run idempotence behavior;
- rollback/cleanup closure;
- `memory write reliable`;
- `RC_READY`.

## Next Best Gap

The next smallest safe step is:

`MEMORY_WRITE_PREFLIGHT_EXACT_SCOPE_CANDIDATE_SOURCE_RUNTIME_WIRING_REVIEW`

Purpose:

- review whether `createCodexMemoryApplication()` should supply this helper to `MemoryWriteService` as an internal candidate source while still preserving default-disabled preflight behavior;
- keep public MCP frozen;
- keep live write proof out of scope.

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_EXACT_SCOPE_CANDIDATE_SOURCE_HELPER_COMPLETED_NOT_READY`.

CM-0891 turns the write-side duplicate/idempotence candidate-source seam from review-only guidance into a reusable internal helper with bounded runtime-adjacent test evidence.

`RC_NOT_READY_BLOCKED` remains.
