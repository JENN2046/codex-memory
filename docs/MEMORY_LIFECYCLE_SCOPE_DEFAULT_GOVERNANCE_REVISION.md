# MEMORY_LIFECYCLE_SCOPE_DEFAULT_GOVERNANCE_REVISION

Status: `MEMORY_LIFECYCLE_SCOPE_DEFAULT_GOVERNANCE_REVISION_COMPLETED_NOT_READY`

Task: `CM-0853`

Date: `2026-05-23`

## Purpose

CM-0852 added a bounded internal hook for `governanceStateRevision`, but it still depended on an injected provider.

CM-0853 makes that hook materially useful on current runtime reality:

- if no custom provider is supplied,
- `KnowledgeBaseSyncService` now derives a default governance revision from current lifecycle/scope metadata already available in the runtime.

This means the current runtime can now invalidate candidate-cache addressing when existing shadow lifecycle/scope metadata changes, without waiting for a future separate durable governance store.

## Source Reality Used

Current repository reality already provides:

- diary records with scope metadata such as `projectId`, `workspaceId`, `clientId`, `taskId`, `conversationId`, `visibility`, and `retentionPolicy`;
- shadow-store records with the same scope metadata plus lifecycle `status`;
- shadow lifecycle updates through `SqliteShadowStore.updateLifecycleStatus()`.

That is enough to derive a bounded governance revision now.

## Implementation

Changed files:

- `src/recall/KnowledgeBaseSyncService.js`
- `tests/recall-isolation-classification-runtime.test.js`

### 1. Default Revision Derivation

When no custom `governanceStateRevisionProvider` is present:

- `KnowledgeBaseSyncService` now derives a default governance revision from active record metadata;
- the revision is based on:
  - `memoryId`
  - `target`
  - shadow lifecycle `status`
  - `projectId`
  - `workspaceId`
  - `clientId`
  - `taskId`
  - `conversationId`
  - `visibility`
  - `retentionPolicy`

### 2. Source Preference

The derivation intentionally follows current repository reality:

- lifecycle `status` is taken from shadow-store metadata, because current diary parsing does not provide lifecycle status;
- scope metadata is taken from diary records first and shadow records as fallback.

### 3. Empty Revision Boundary

If no governance-relevant metadata is present, the default derived revision remains empty.

That keeps the hook bounded and avoids inventing governance invalidation where no governance signal exists.

## Validation

Targeted validation for CM-0853:

- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Passed:

- `tests/recall-isolation-classification-runtime.test.js` `16/16`

New covered assertions:

- default governance revision changes when shadow lifecycle metadata changes;
- default governance revision stays empty when no governance metadata exists.

## Boundary

CM-0853 does not:

- add a new durable governance store;
- add proposal / approval / supersession / tombstone / forget durable writes;
- add eager candidate-cache flush on governance-only revision change;
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

CM-0853 makes the current hook real for existing shadow lifecycle/scope metadata, but governance closure is still incomplete.

Open work still includes:

- deciding whether governance-only changes need eager candidate-cache flush rather than key-only invalidation;
- introducing any future durable governance store or append-only governance records;
- proving a governance mutation path with bounded synthetic/runtime evidence;
- later deciding whether deeper candidate-generator governance rewiring is justified.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DEFAULT_GOVERNANCE_REVISION_COMPLETED_NOT_READY`

This is a bounded internal default derivation only. It moves the governance/cache path closer to the long-term runtime goal without widening current claims.
