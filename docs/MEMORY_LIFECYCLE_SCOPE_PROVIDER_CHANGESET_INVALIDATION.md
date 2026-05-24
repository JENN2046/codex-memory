# Memory Lifecycle Scope Provider Change-Set Invalidation

Status: `MEMORY_LIFECYCLE_SCOPE_PROVIDER_CHANGESET_INVALIDATION_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0859`

## Purpose

CM-0858 let custom governance providers opt into per-record invalidation by returning a bounded snapshot object shaped like `{ revision, entries }`.

CM-0859 closes the next smallest provider-flexibility gap:

- custom governance providers may now return `changedMemoryIds` without supplying a full replacement snapshot;
- when `changedMemoryIds` are present, governance-only drift can invalidate candidate cache by the supplied `memoryId` set;
- snapshot-based `{ revision, entries }` behavior remains supported;
- legacy scalar/string provider revisions still keep the existing fail-closed target-family fallback.

This makes provider-side governance invalidation more incremental without widening the public contract.

## Implementation

Changed files:

- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Provider Contract Now Accepts A Sparse Change-Set

`governanceStateRevisionProvider` may now return any of these internal forms:

- legacy scalar/string revision;
- snapshot object: `{ revision, entries }`;
- sparse delta object: `{ revision, changedMemoryIds }`;
- combined form: `{ revision, entries, changedMemoryIds }`.

All forms stay internal to `KnowledgeBaseSyncService`.

### 2. Explicit `changedMemoryIds` Take The Fast Path

When governance revision changes and provider `changedMemoryIds` are present:

- `KnowledgeBaseSyncService.syncTarget()` now invalidates candidate cache by those normalized `memoryId` values directly.

This avoids requiring a full provider snapshot when the provider already knows the exact affected records.

### 3. Existing Paths Stay Backward-Compatible

The precedence is now:

- explicit provider `changedMemoryIds`;
- otherwise diff previous/current governance `entries`;
- otherwise existing target-family fallback;
- `target='both'` still fails closed to current-fingerprint clear when needed.

That preserves all earlier behavior while adding a narrower provider-side path.

## Validation

Targeted validation for CM-0859:

- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `26/26`

New covered assertions:

- custom provider governance drift can invalidate by explicit `changedMemoryIds` without full snapshot entries;
- snapshot-based provider path still invalidates by changed `memoryId`;
- legacy provider scalar revisions still use target-family fallback.

## Boundary

CM-0859 does not:

- add a durable governance mutation store;
- require providers to expose full snapshots or change-sets universally;
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

CM-0859 improves provider-side invalidation precision, but it still does not prove:

- durable governance mutation flow;
- provider-side semantic guarantees for tombstone/supersession/scope transitions beyond changed `memoryId` sets;
- governance mutation persistence outside current shadow-derived metadata;
- pre-ranking governance integration;
- true live governance runtime behavior.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_PROVIDER_CHANGESET_INVALIDATION_COMPLETED_NOT_READY`

This is a bounded internal precision improvement only. It lets custom governance providers invalidate by sparse changed-record sets without requiring full snapshot replacement, while keeping legacy behavior fail-closed.
