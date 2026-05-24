# Memory Lifecycle Scope Governance Per-Record Invalidation

Status: `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_PER_RECORD_INVALIDATION_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0857`

## Purpose

CM-0856 made ordinary sync invalidation dependency-aware by candidate `memoryId`.

CM-0857 closes the next smallest governance gap:

- when governance-only drift occurs on the default derived governance path, candidate-cache invalidation now uses changed governance `memoryId` values;
- when governance revision comes from a custom provider without per-record snapshot support, invalidation still falls back to the existing target-family path from CM-0855.

This keeps the design fail-closed while making the default governance path more selective.

## Implementation

Changed files:

- `src/storage/CandidateCacheStore.js`
- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Candidate Cache Persists Governance Entry Snapshots

`CandidateCacheStore` now persists per-target governance entry snapshots in current-fingerprint metadata:

- `getStoredGovernanceStateEntries(target)`
- `setStoredGovernanceStateEntries(target, entries)`

These snapshots live beside the existing stored governance revision hashes.

They are cleared with the same current-fingerprint target cleanup path.

### 2. Default Governance Path Computes Per-Record Drift

`KnowledgeBaseSyncService` now resolves a governance snapshot rather than only a revision string:

- default path: derive governance entries, then hash them into the revision;
- custom provider path: revision only, no per-record entries.

When the default path is active, sync can compare:

- previous stored governance entries
- current derived governance entries

and compute exactly which `memoryId` values changed governance state.

### 3. Governance-Only Drift Now Uses Per-Record Invalidation When Possible

If governance revision changed and per-record governance diff is available:

- invalidate by changed `memoryId` through `clearCurrentFingerprintByMemoryIds(...)`

If governance revision changed but only a custom provider revision is available:

- preserve the bounded target-family invalidation path from CM-0855

This split is intentional. The default path is now more precise; custom provider mode stays fail-closed until it can supply comparable per-record snapshot semantics.

## Validation

Targeted validation for CM-0857:

- `node --check src\storage\CandidateCacheStore.js`
- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `24/24`

New covered assertions:

- governance state entries persist per current-fingerprint target;
- default governance drift clears cache by changed governance `memoryId`;
- custom provider governance drift keeps target-family invalidation fallback.

## Boundary

CM-0857 does not:

- add a new durable governance mutation store;
- add provider-side per-record governance snapshot contracts;
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

CM-0857 improves the default governance path only.

It still does not prove:

- durable governance mutation flow;
- provider-side per-record governance diffing;
- governance mutation persistence outside current shadow-derived metadata;
- pre-ranking governance integration;
- true live governance runtime behavior.

If future work wants custom provider governance revisions to invalidate at per-record precision, the provider contract will need to expose comparable entry snapshots or change-set semantics.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_PER_RECORD_INVALIDATION_COMPLETED_NOT_READY`

This is a bounded internal precision improvement only. It makes governance-only invalidation more selective on the default path without widening current claims.
