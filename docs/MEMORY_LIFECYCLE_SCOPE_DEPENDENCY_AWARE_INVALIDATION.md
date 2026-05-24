# Memory Lifecycle Scope Dependency-Aware Invalidation

Status: `MEMORY_LIFECYCLE_SCOPE_DEPENDENCY_AWARE_INVALIDATION_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0856`

## Purpose

CM-0855 narrowed candidate-cache invalidation to target family:

- `process -> process + both`
- `knowledge -> knowledge + both`
- `both -> full current fingerprint`

CM-0856 closes the next smallest precision gap:

- ordinary sync changes now invalidate current-fingerprint candidate-cache entries by dependent `memoryId` when that dependency is known;
- governance-only revision drift still uses the existing target-family invalidation path from CM-0855.

This keeps the implementation bounded while reducing unnecessary cache churn for ordinary record refreshes and prunes.

## Implementation

Changed files:

- `src/storage/CandidateCacheStore.js`
- `src/recall/CandidateGenerator.js`
- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Candidate Cache Entries Now Persist Dependent Memory IDs

`CandidateGenerator.generate()` now passes candidate dependency metadata into `CandidateCacheStore.set()`:

- unique `memoryIds` extracted from generated candidates

`CandidateCacheStore` persists those IDs per cache entry.

This does not change the public contract or cache key. It only enriches internal invalidation metadata.

### 2. Candidate Cache Can Clear By Dependent Memory IDs

`CandidateCacheStore` now adds:

- `clearCurrentFingerprintByMemoryIds(memoryIds, targets)`

Behavior:

- remove current-fingerprint entries whose stored `memoryIds` intersect the changed memory ids;
- for old/current entries that have no dependency metadata, fail closed by removing entries in the fallback target family;
- leave governance revision metadata untouched, because ordinary content/index refresh does not by itself mean governance revision changed.

### 3. Sync Uses Dependency-Aware Invalidation For Ordinary Changes

`KnowledgeBaseSyncService.syncTarget()` now tracks `changedMemoryIds` for:

- refreshed records;
- isolated projection-clears;
- pruned records.

If sync changed ordinary state and governance revision did not change:

- first choice: clear cache by dependent `memoryId`;
- fallback: clear by target family using the CM-0855 logic;
- last fallback: clear the whole current fingerprint if narrower helpers are unavailable.

If governance revision changed:

- keep the existing CM-0855 target-family invalidation path.

That split is intentional. Governance-only drift is still modeled at target-family granularity, while ordinary sync changes now use finer candidate dependency metadata.

## Validation

Targeted validation for CM-0856:

- `node --check src\storage\CandidateCacheStore.js`
- `node --check src\recall\CandidateGenerator.js`
- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `22/22`

New covered assertions:

- current-fingerprint cache can clear entries by dependent `memoryId` while preserving unrelated entries;
- ordinary sync change without governance drift clears by `memoryId` rather than by broad target family when dependency metadata is available;
- governance-only drift still keeps its separate bounded invalidation path.

## Boundary

CM-0856 does not:

- add a new durable governance store;
- add per-record governance diffing for governance-only mutations;
- add proposal / approval / supersession / tombstone / forget durable writes;
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

CM-0856 improves invalidation precision for ordinary sync mutations only.

It still does not prove:

- durable governance mutation flow;
- governance-only per-record dependency invalidation;
- dependency-aware invalidation beyond candidate `memoryId` sets;
- pre-ranking governance integration;
- true live governance runtime behavior.

If future work wants governance-only invalidation to become record-level rather than target-family level, it will need a stronger durable governance mutation model or persisted per-record governance diff state.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DEPENDENCY_AWARE_INVALIDATION_COMPLETED_NOT_READY`

This is a bounded internal precision improvement only. It makes ordinary sync-driven cache invalidation more selective without widening current governance/readiness claims.
