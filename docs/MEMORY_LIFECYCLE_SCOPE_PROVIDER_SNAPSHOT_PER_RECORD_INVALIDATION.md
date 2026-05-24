# Memory Lifecycle Scope Provider Snapshot Per-Record Invalidation

Status: `MEMORY_LIFECYCLE_SCOPE_PROVIDER_SNAPSHOT_PER_RECORD_INVALIDATION_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0858`

## Purpose

CM-0857 made governance-only invalidation per-record on the default derived-governance path.

CM-0858 closes the next smallest provider-side gap:

- custom governance providers may now return a bounded snapshot object with `revision` and per-record `entries`;
- when those provider entries are present, governance-only drift can invalidate candidate cache by changed `memoryId`;
- legacy scalar/string provider revisions still keep the existing fail-closed target-family fallback.

This narrows custom-provider invalidation without widening the public contract or removing the legacy fallback.

## Implementation

Changed files:

- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Provider Contract Is Now Backward-Compatible But Richer

`governanceStateRevisionProvider` may now return either:

- a legacy scalar/string revision; or
- an object shaped like `{ revision, entries }`.

The legacy scalar path is unchanged in meaning and still stores no per-record entries.

The object path remains internal only. It lets a provider supply a bounded governance snapshot without touching public MCP tools or arguments.

### 2. Provider Entries Reuse The Existing Per-Record Drift Path

`KnowledgeBaseSyncService.resolveGovernanceStateSnapshot()` now normalizes provider-supplied `entries` and carries them through the same governance snapshot path already used by CM-0857.

That means provider mode can now participate in:

- stored governance entry snapshots;
- per-record governance drift comparison;
- changed-`memoryId` candidate-cache invalidation.

### 3. Legacy Provider Fallback Is Preserved

If a custom provider still returns only a scalar revision:

- `entries` stay `null`;
- governance-only drift still clears by target family, not by `memoryId`.

This preserves fail-closed behavior for older provider integrations.

## Validation

Targeted validation for CM-0858:

- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `25/25`

New covered assertions:

- custom provider governance snapshots can invalidate by changed `memoryId`;
- legacy custom provider scalar revisions still use target-family fallback.

## Boundary

CM-0858 does not:

- add a durable governance mutation store;
- require providers to implement per-record snapshots;
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

CM-0858 narrows the custom-provider path only when the provider opts into per-record snapshots.

It still does not prove:

- durable governance mutation flow;
- provider-side change-set semantics beyond full entry snapshots;
- governance mutation persistence outside current shadow-derived metadata;
- pre-ranking governance integration;
- true live governance runtime behavior.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_PROVIDER_SNAPSHOT_PER_RECORD_INVALIDATION_COMPLETED_NOT_READY`

This is a bounded internal precision improvement only. It lets custom governance providers participate in per-record invalidation when they supply comparable snapshots, while keeping legacy provider behavior fail-closed.
