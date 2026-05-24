# MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_SYNC_TOKEN_HOOK

Status: `MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_SYNC_TOKEN_HOOK_COMPLETED_NOT_READY`

Task: `CM-0852`

Date: `2026-05-23`

## Purpose

CM-0851 concluded that future durable governance mutation must eventually reach candidate-cache invalidation through either:

- sync-token/cache-key enrichment, or
- explicit bounded invalidation rules.

CM-0852 implements the smallest internal/runtime-safe part of that recommendation:

- `KnowledgeBaseSyncService` now has an optional internal `governanceStateRevisionProvider`;
- `syncTarget()` returns `governanceStateRevision` when that provider exists;
- `buildSyncToken()` conditionally absorbs `governanceStateRevision`;
- `KnowledgeBaseRecallPipeline.search()` forwards the same revision into `CandidateGenerator.generate()`;
- `CandidateGenerator.buildCacheKey()` conditionally absorbs `governanceStateRevision`.

This does not add durable governance state. It adds a bounded hook so future durable governance state can participate in recall sync/cache keying without public MCP expansion.

## Implemented Files

- `src/recall/KnowledgeBaseSyncService.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/recall/CandidateGenerator.js`
- `tests/recall-isolation-classification-runtime.test.js`

## What Changed

### 1. Optional Governance Revision Provider

`KnowledgeBaseSyncService` now accepts an optional internal `governanceStateRevisionProvider`.

When present:

- `syncTarget()` asks the provider for a bounded revision string;
- the revision is returned as `governanceStateRevision`;
- the revision is conditionally hashed into `syncToken`.

When absent:

- behavior remains the current default;
- `governanceStateRevision` resolves to `''`;
- current sync-token shape remains effectively unchanged.

### 2. Cache-Key Absorption

`CandidateGenerator.buildCacheKey()` now conditionally absorbs `governanceStateRevision`.

That means a future durable governance-state change can alter candidate-cache addressing even if query text, directives, candidate filters, context signature, and embedding fingerprint remain the same.

### 3. Pipeline Pass-Through

`KnowledgeBaseRecallPipeline.search()` now forwards `syncState.governanceStateRevision` into candidate generation.

This keeps the governance revision path explicit at the recall-pipeline boundary rather than hiding it only inside `syncToken`.

## Validation

Targeted validation for CM-0852:

- `node --check src\recall\KnowledgeBaseSyncService.js`
- `node --check src\recall\KnowledgeBaseRecallPipeline.js`
- `node --check src\recall\CandidateGenerator.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js`

Covered assertions:

- candidate-cache key changes when `governanceStateRevision` changes;
- sync token changes when governance revision changes;
- recall pipeline forwards governance revision from sync to candidate generation;
- existing recall isolation / sync abort / cache abort behavior remains covered in the same targeted runtime file.

## Boundary

CM-0852 does not:

- create durable governance records;
- implement proposal / approval / supersession / tombstone / forget flows;
- add eager candidate-cache flush on governance-only revision change;
- add user/agent/folder runtime scope projection;
- rewire candidate generation to apply lifecycle/scope governance before ranking;
- execute true live `record_memory` or true live `search_memory`;
- read real memory content or direct real `.jsonl`;
- call provider/API services;
- write durable memory/audit state;
- run cleanup apply / rollback apply;
- expand public MCP tools or arguments;
- claim `memory recall reliable`, `memory write reliable`, `RC_READY`, or production readiness.

## Remaining Gap

CM-0852 closes the smallest internal hook gap identified by CM-0851, but it does not finish candidate-cache invalidation for governance closure.

Remaining work still includes at least:

- deciding where future durable governance state lives;
- deciding whether governance-only revision changes also need eager cache flush instead of key-only invalidation;
- proving the future durable governance mutation path with bounded synthetic/runtime evidence;
- later deciding whether deeper candidate-generator governance rewiring is justified.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_GOVERNANCE_SYNC_TOKEN_HOOK_COMPLETED_NOT_READY`

This is a bounded internal sync/cache-key hook only. It makes the long-term governance closure path more real without widening current claims.
