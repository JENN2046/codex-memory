# Memory Lifecycle Scope Candidate-Cache Invalidation Review

Status: `MEMORY_LIFECYCLE_SCOPE_CANDIDATE_CACHE_INVALIDATION_REVIEW_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0851`

## Purpose

This review inspects how the current candidate-cache path interacts with the CM-0850 internal/default-disabled lifecycle/scope governance bridge.

It does not implement cache invalidation, candidate-generator rewiring, durable governance state, or public MCP changes.

It does not execute true live `record_memory`, true live `search_memory`, real memory scans, real memory content reads, direct real `.jsonl` reads, provider calls, durable memory/audit writes, cleanup apply, rollback apply, public MCP expansion, package/config/watchdog/startup changes, or readiness/reliability transitions.

## Reviewed Source

- `src/recall/CandidateGenerator.js`
- `src/storage/CandidateCacheStore.js`
- `src/recall/KnowledgeBaseSyncService.js`
- `src/app.js`
- `docs/MEMORY_LIFECYCLE_SCOPE_RUNTIME_INTEGRATION.md`
- `docs/MEMORY_LIFECYCLE_SCOPE_RUNTIME_INTEGRATION_CANDIDATE_REVIEW.md`

## Current Cache Path

Current runtime shape:

- `CandidateGenerator.generate()` builds a cache key from query text, directives, search plan, isolation-classifier version, existing candidate filters, context signature, and `syncToken`.
- On cache hit, `CandidateGenerator.filterCandidateState()` applies only recall-isolation filtering before returning cached candidates.
- On cache miss, `CandidateGenerator.generate()` reads chunks, ranks candidates, and writes candidate cache only when `readOnly !== true`.
- `KnowledgeBaseSyncService.syncTarget()` clears the current embedding fingerprint cache only when diary/shadow/vector/chunk state changed during sync.
- `CM-0850` lifecycle/scope governance filtering currently happens later in `src/app.js`, after `passiveRecallService.search()` returns final results.

## Findings

### 1. Current CM-0850 Bridge Is Safe On Cache Hits

Accepted.

The CM-0850 bridge runs after cached or uncached search results return from the passive recall pipeline.

That means a cache hit does not bypass lifecycle/scope governance filtering. Results retrieved from candidate cache still flow through:

- existing scope filter;
- existing optional lifecycle filter;
- internal/default-disabled lifecycle/scope governance bridge when enabled;
- soft read policy.

So the current bounded bridge does not introduce a governance bypass merely because candidate generation was served from cache.

### 2. Candidate Cache Does Not Yet Encode Governance State

Open gap.

The candidate-cache key currently depends on:

- query text;
- directives and search plan;
- isolation-classifier version;
- candidate filters;
- context signature;
- `syncToken`;
- embedding fingerprint.

It does not include:

- lifecycle/scope governance bridge enablement;
- lifecycle status revision;
- scope-governance state revision;
- durable proposal / approval / supersession / tombstone / forget state;
- any governance-specific invalidation token.

This is acceptable for CM-0850 because governance filtering is still post-result and default-disabled, but it is not yet proof that future durable governance mutations will invalidate stale candidate sets.

### 3. Current `syncToken` Tracks Diary Sync State, Not Governance State

Open gap.

`KnowledgeBaseSyncService.buildSyncToken()` currently hashes only:

- `memoryId`
- `updatedAt`
- `relativePath`
- `target`

for diary-derived records.

That means future durable governance mutations stored outside this diary sync shape could leave the candidate-cache key unchanged even when governance eligibility changed.

If later governance state becomes durable in SQLite or another store, either:

- the cache key/sync token must absorb a governance-state version, or
- an exact bounded invalidation rule must clear affected candidate-cache entries on governance mutation.

### 4. Review Does Not Yet Justify Candidate-Generator Rewiring

Accepted.

The smallest safe conclusion is still review-only.

CM-0850 intentionally chose a post-result bridge because it had the smallest blast radius and left ranking/candidate-cache behavior untouched.

This review confirms that decision remains appropriate:

- current post-result governance filtering is compatible with cache hits;
- current cache behavior does not yet prove governance-aware invalidation;
- deeper `CandidateGenerator` rewiring should not begin until the project chooses a durable governance-state model or an explicit bounded invalidation contract.

## Review Verdict

`CM-0851` accepts the following bounded conclusion:

- CM-0850 does not create a candidate-cache governance bypass on cache hits.
- Candidate-cache invalidation for future durable governance mutations remains unproven.
- The next smallest governance/cache step should stay read-only or planning-oriented unless a narrowly scoped invalidation contract is selected.

This review is not sufficient to claim:

- governance runtime loop complete;
- candidate-cache governance-safe;
- memory recall reliable;
- memory write reliable;
- runtime readiness;
- RC readiness;
- production readiness.

## Next Minimal Gate

The next safe gate should be one of:

1. `MEMORY_LIFECYCLE_SCOPE_CANDIDATE_CACHE_INVALIDATION_PLAN`
2. `MEMORY_LIFECYCLE_DURABLE_GOVERNANCE_STATE_PLAN`

The smaller of the two is likely the candidate-cache invalidation plan, because it can define:

- what future governance mutation types must invalidate cache;
- whether invalidation is global, fingerprint-scoped, or exact bounded subset;
- whether invalidation should be driven by sync-token enrichment or explicit cache clears;
- what targeted non-live tests would prove the intended behavior.

Until that plan exists, candidate-generator rewiring and governance-state mutation integration should remain out of scope for this slice.

## Boundary

This review did not execute true live `record_memory`, true live `search_memory`, real memory scans, real memory content reads, direct real `.jsonl` reads, provider/model/API calls, durable memory/audit writes, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup changes, tag/release/deploy/cutover, force push, branch rewrite, or readiness/reliability claims.

`RC_NOT_READY_BLOCKED` remains the controlling state.
