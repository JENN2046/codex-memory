# MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_CACHE_INVALIDATION

Status: `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_CACHE_INVALIDATION_COMPLETED_NOT_READY`

Task: `CM-0854`

Date: `2026-05-23`

## Purpose

CM-0852 added the sync/cache-key hook.

CM-0853 made the hook active on current runtime lifecycle/scope metadata.

CM-0854 closes the next smallest real gap: governance-only revision drift now triggers bounded candidate-cache invalidation even when ordinary diary-content sync did not change.

## Current-State Supersession Note

This document is retained as the historical broad-invalidation step.

It must not be read as the final candidate-cache invalidation shape. Later committed evidence refines this path:

- `MEMORY_LIFECYCLE_SCOPE_TARGET_LOCAL_INVALIDATION_COMPLETED_NOT_READY` narrows invalidation by target family.
- `MEMORY_LIFECYCLE_SCOPE_DEPENDENCY_AWARE_INVALIDATION_COMPLETED_NOT_READY` narrows ordinary sync invalidation by dependent `memoryId`.
- `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_PER_RECORD_INVALIDATION_COMPLETED_NOT_READY` narrows default governance drift by changed governance `memoryId`.
- provider snapshot and provider change-set evidence narrow custom-provider governance drift when provider data is available.

The still-current boundary is that these remain internal recall/cache invalidation paths only. They do not prove live recall reliability, write reliability, durable governance mutation readiness, or RC readiness.

## Implementation

Changed files:

- `src/storage/CandidateCacheStore.js`
- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Candidate Cache Tracks Stored Governance Revisions

`CandidateCacheStore` now maintains fingerprint-scoped metadata for stored governance revisions by target.

Internal additions:

- `getStoredGovernanceStateRevision(target)`
- `setStoredGovernanceStateRevision(target, revision)`

The metadata is scoped to the current embedding fingerprint and is cleared when the current fingerprint cache is cleared.

### 2. Governance-Only Drift Triggers Cache Invalidation

`KnowledgeBaseSyncService.syncTarget()` now:

- reads the previously stored governance revision for the current target;
- computes the current governance revision;
- compares the two revisions;
- clears current-fingerprint candidate cache when either:
  - ordinary sync state changed, or
  - governance revision changed even though diary-content refresh did not.

After invalidation, it stores the latest governance revision for the target.

### 3. Invalidating Current Fingerprint Is Intentional

CM-0854 uses a conservative invalidation shape:

- clear current fingerprint candidate cache broadly.

This is intentionally broader than target-local eviction because current `target='both'` cache entries can depend on either subtarget's governance state.

## Validation

Targeted validation for CM-0854:

- `node --check src\storage\CandidateCacheStore.js`
- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `18/18`

New covered assertions:

- candidate cache store persists governance revision metadata per current fingerprint;
- current-fingerprint clear removes both entries and governance metadata;
- governance-only revision drift triggers current-fingerprint cache clear even when ordinary diary-content refresh did not occur.

## Boundary

CM-0854 does not:

- add a new durable governance store;
- add proposal / approval / supersession / tombstone / forget durable writes;
- add fine-grained target-local cache invalidation;
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

CM-0854 makes governance-related cache invalidation real, but governance closure is still incomplete.

Remaining work still includes:

- deciding whether later target-local or smarter invalidation is worth the complexity;
- introducing any future durable governance mutation flow;
- proving a governance mutation path with bounded synthetic/runtime evidence;
- later deciding whether deeper candidate-generator governance rewiring is justified.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_CACHE_INVALIDATION_COMPLETED_NOT_READY`

This is a bounded internal invalidation step only. It improves correctness of governance-sensitive recall caching without widening current claims.
