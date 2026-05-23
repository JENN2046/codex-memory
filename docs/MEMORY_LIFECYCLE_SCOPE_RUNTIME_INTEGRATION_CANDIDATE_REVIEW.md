# Memory Lifecycle Scope Runtime Integration Candidate Review

Status: `MEMORY_LIFECYCLE_SCOPE_RUNTIME_INTEGRATION_CANDIDATE_REVIEW_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0849`

## Purpose

This review inspects the current `search_memory` and recall candidate path after CM-0848 accepted bounded temp-local lifecycle/scope evidence.

It selects the smallest future runtime integration candidate for lifecycle/scope governance without implementing it.

This review does not execute true live `record_memory`, true live `search_memory`, real memory scans, real memory content reads, direct real `.jsonl` reads, provider calls, durable memory/audit writes, cleanup apply, rollback apply, public MCP expansion, package/config/watchdog/startup changes, or readiness/reliability transitions.

## Reviewed Runtime Path

Reviewed source:

- `src/app.js`
- `src/core/PassiveRecallService.js`
- `src/recall/KnowledgeBaseRecallPipeline.js`
- `src/recall/CandidateGenerator.js`
- `src/storage/SqliteShadowStore.js`
- `src/core/MemoryLifecycleScopeGovernanceContract.js`
- current lifecycle/read-policy tests and status surfaces

Current runtime shape:

- `executeSearchMemory()` calls `passiveRecallService.search()`.
- `PassiveRecallService.search()` delegates to `KnowledgeBaseRecallPipeline.search()`.
- `KnowledgeBaseRecallPipeline.search()` builds query context, optionally syncs when not read-only, generates candidates through `CandidateGenerator.generate()`, reranks/finalizes chunks, aggregates candidates, enhances results, and records recall audit only when not read-only.
- `CandidateGenerator.generate()` retrieves chunks from `shadowStore.listChunks()` / `listChunksByTimeRanges()`, obtains query embeddings, ranks candidates, and writes candidate cache only when not read-only.
- `executeSearchMemory()` then applies app-level `applyScopeFilter()`, optional `applyLifecycleReadPolicy()`, and optional `applySoftReadPolicy()` to final results.

## Existing Runtime Boundary

The repository already has an older optional lifecycle read-policy surface:

- `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` defaults to `false`.
- When enabled, `applyLifecycleReadPolicy()` keeps `active` and `stale`.
- It excludes `proposal`, `rejected`, `superseded`, and `tombstoned`.
- It fails closed when the `status` column is unavailable.
- It records read-policy audit summary only when lifecycle read policy is enabled and the request is not read-only.

This surface is useful but narrower than the CM-0844/CM-0845 lifecycle/scope governance contract.

## Gap Against CM-0844/CM-0845 Contract

The current runtime path does not yet fully enforce the CM-0844/CM-0845 lifecycle/scope contract because:

- `applyLifecycleReadPolicy()` does not cover `preflight_rejected`, `forgotten`, `excluded`, `quarantined`, malformed lifecycle metadata, malformed scope metadata, or unresolved bad-write remediation.
- `applyScopeFilter()` covers only a subset of scope dimensions: project, workspace, client, and visibility.
- The CM-0844/CM-0845 scope tuple also includes user, agent, task, conversation, folder, and retention policy.
- The runtime lifecycle filter reads only `status`; it does not yet consume a durable governance state model for proposal / approval / supersession / tombstone / forget.
- Candidate filtering currently occurs after aggregation and enhancement at the app level, so suppressed candidates are not yet represented with the same sanitized blocker/mismatch metadata shape proven by `filterRecallCandidatesByLifecycleScope()`.
- Candidate cache behavior has not been reviewed for lifecycle/scope governance invalidation or exclusion semantics.

Therefore the existing runtime flag is not equivalent to runtime lifecycle/scope governance implementation.

## Candidate Integration Point

The next smallest implementation candidate should be an internal, default-disabled read-policy bridge placed after `passiveRecallService.search()` returns final results and before `applySoftReadPolicy()`.

The bridge should:

- stay internal and avoid public MCP schema expansion;
- reuse or adapt `filterRecallCandidatesByLifecycleScope()` for final-result filtering first;
- derive current scope from the existing `args.scope` and resolved request/execution context;
- obtain lifecycle/scope metadata only by exact `memoryId` lookup, not by broad real-memory scan;
- fail closed if current scope is incomplete for an enabled strict governance mode;
- return accepted results plus sanitized suppressed metadata without raw `content`, `text`, `title`, `snippet`, `sourceFile`, or `.jsonl` fields;
- avoid provider calls;
- avoid durable write or audit write in read-only proof/review modes;
- leave the current public `search_memory` arguments unchanged.

This post-result bridge is deliberately chosen before deeper `CandidateGenerator` integration because it has the smallest blast radius and can reuse existing `search_memory` result shape. A later candidate-generator stage may be needed after bounded tests prove cache invalidation and ranking interactions.

## Required Future Tests

Before implementation is accepted, targeted tests should cover:

- default-disabled behavior preserves existing `search_memory` results;
- enabled strict mode suppresses proposal / rejected / preflight-rejected / superseded / tombstoned / forgotten / excluded / stale / quarantined / unresolved-remediation / malformed records;
- exact scope mismatch suppresses records and reports sanitized mismatch metadata;
- incomplete current scope fails closed only for the enabled strict governance mode;
- read-only proof mode does not record read-policy audit;
- no provider, candidate-cache write, sync write, vector flush, durable memory write, or durable audit write side effects occur in read-only bounded tests;
- public MCP schema remains unchanged.

## Review Verdict

`CM-0849` accepts `MEMORY_LIFECYCLE_SCOPE_RUNTIME_INTEGRATION_CANDIDATE_REVIEW` as the next governance-closure step.

The recommended next implementation is a default-disabled internal post-result lifecycle/scope read-policy bridge, not candidate-generator rewiring and not public MCP expansion.

This review is not sufficient to claim:

- runtime lifecycle governance implemented;
- runtime read-policy integrated;
- memory recall reliable;
- memory write reliable;
- runtime readiness;
- RC readiness;
- production readiness.

## Next Minimal Gate

The next safe gate is `MEMORY_LIFECYCLE_SCOPE_RUNTIME_INTEGRATION_PLAN_OR_IMPLEMENTATION`.

If implemented, it should be a minimal internal/default-disabled bridge with targeted tests and no true live memory action. If the implementation scope looks larger than a post-result bridge, stop and split it into a plan first.

## Boundary

This review did not execute true live `record_memory`, true live `search_memory`, real memory scans, real memory content reads, direct real `.jsonl` reads, provider/model/API calls, durable memory/audit writes, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup changes, tag/release/deploy/cutover, force push, branch rewrite, or readiness/reliability claims.

`RC_NOT_READY_BLOCKED` remains the controlling state.
