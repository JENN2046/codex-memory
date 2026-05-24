# Memory Lifecycle Scope Target-Local Invalidation

Status: `MEMORY_LIFECYCLE_SCOPE_TARGET_LOCAL_INVALIDATION_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0855`

## Purpose

CM-0854 made governance-only revision drift invalidate the entire current-fingerprint candidate cache.

CM-0855 narrows that blast radius without changing the public contract:

- when the changed sync target is `process`, invalidate `process` and `both` cache entries for the current fingerprint;
- when the changed sync target is `knowledge`, invalidate `knowledge` and `both` cache entries for the current fingerprint;
- when the sync target is `both`, keep the broader current-fingerprint clear.

This slice does not introduce durable governance mutation, proposal/approval runtime flow, public MCP expansion, or readiness/reliability claims.

## Reviewed Runtime Facts

Current target semantics in source:

- `DiaryStore.listRecords({ target })` expands `both` into both diary families.
- `SqliteShadowStore.listRecords(target)` and `listChunks(target)` treat `both` as the union of `process` and `knowledge`.
- `CandidateGenerator.buildCacheKey()` already includes the requested `target`.
- `CandidateCacheStore.set()` already persists `entry.target` for each cache entry.

That means the existing candidate-cache surface already distinguishes:

- `process`
- `knowledge`
- `both`

at cache-entry level, even though CM-0854 still cleared the whole current fingerprint.

## Implementation

Changed files:

- `src/storage/CandidateCacheStore.js`
- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Candidate Cache Can Clear Selected Targets

`CandidateCacheStore` now adds:

- `clearCurrentFingerprintTargets(targets)`

This removes only current-fingerprint entries whose stored `entry.target` is in the selected target set.

It also removes stored governance revision metadata for the same selected targets.

### 2. Sync Uses Target-Aware Invalidation

`KnowledgeBaseSyncService.syncTarget()` now chooses invalidation scope from the sync target:

- `process` -> clear `process` and `both`
- `knowledge` -> clear `knowledge` and `both`
- `both` -> keep broad `clearCurrentFingerprint()`

This applies to:

- ordinary sync changes; and
- governance-only revision drift

because both can make cached candidate sets stale for the affected target family.

### 3. `both` Still Fails Closed

CM-0855 intentionally keeps `target='both'` on the broad path.

That is conservative and appropriate because a `both` cache entry is a union query by definition, so narrowing invalidation further would need more dependency metadata than the current cache format stores.

## Validation

Targeted validation for CM-0855:

- `node --check src\storage\CandidateCacheStore.js`
- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `20/20`

New covered assertions:

- current-fingerprint cache can clear only selected targets while preserving unrelated target entries;
- target-scoped governance revision metadata is cleared only for selected targets;
- process-target governance drift clears `process` and `both` rather than the whole fingerprint;
- `target='both'` still falls back to full current-fingerprint invalidation.

## Boundary

CM-0855 does not:

- add a new durable governance store;
- add proposal / approval / supersession / tombstone / forget durable writes;
- add dependency-vector or record-level cache invalidation;
- add user/agent/folder governance projection;
- rewire candidate generation to apply governance before ranking;
- execute true live `record_memory` or true live `search_memory`;
- read real memory content or direct real `.jsonl`;
- call provider/API services;
- write durable memory/audit state;
- run cleanup apply / rollback apply;
- expand public MCP tools or arguments;
- claim `memory recall reliable`, `memory write reliable`, `RC_READY`, or production readiness.

## Remaining Gap

CM-0855 improves invalidation precision by one dimension only: requested target family.

It still does not prove:

- durable governance mutation flow;
- dependency-aware invalidation beyond `process` / `knowledge` / `both`;
- pre-ranking governance integration;
- true live governance runtime behavior.

If future work wants to narrow invalidation beyond target family, it will need additional dependency metadata or a stronger durable governance revision model.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_TARGET_LOCAL_INVALIDATION_COMPLETED_NOT_READY`

This is a bounded internal precision improvement only. It reduces unnecessary candidate-cache invalidation while preserving fail-closed behavior for `target='both'`.
