# Memory Lifecycle Scope Runtime Integration

Status: `MEMORY_LIFECYCLE_SCOPE_RUNTIME_INTEGRATED_BOUNDED_NOT_READY`
Date: 2026-05-23
Task: `CM-0850`

## Purpose

This document records the minimal runtime bridge implemented after CM-0849.

The bridge moves lifecycle/scope governance one step from fixture/temp-local evidence toward runtime integration while keeping it internal, default-disabled, and bounded.

It does not execute true live `record_memory`, true live `search_memory`, real memory scans, real memory content reads, direct real `.jsonl` reads, provider calls, durable memory/audit writes, cleanup apply, rollback apply, public MCP expansion, package/config/watchdog/startup changes, or readiness/reliability transitions.

## Implemented Scope

Changed runtime files:

- `src/app.js`
- `src/core/MemoryLifecycleScopeGovernanceContract.js`
- `src/storage/SqliteShadowStore.js`

Added targeted test:

- `tests/memory-lifecycle-scope-runtime-integration.test.js`

Implemented behavior:

- added `applyLifecycleScopeGovernanceReadPolicy()` as an internal post-result bridge;
- bridge is default-disabled;
- bridge is enabled only by internal `requestContext.executionContext.lifecycleScopeGovernanceReadPolicy === true`;
- public `search_memory` arguments and public MCP tools remain unchanged;
- bridge runs after existing scope/lifecycle filtering and before soft read policy;
- bridge uses exact `memoryId` metadata lookup through `SqliteShadowStore.getRecordsLifecycleScopeGovernanceMap()`;
- metadata lookup selects only lifecycle/scope fields, not raw memory content;
- bridge reuses CM-0844/CM-0845 `filterRecallCandidatesByLifecycleScope()`;
- helper now supports a caller-provided `requiredScopeFields` list while preserving full-scope fail-closed default behavior;
- accepted runtime results preserve the original result object;
- suppressed runtime candidates only produce sanitized metadata;
- raw `content`, `text`, `title`, `snippet`, `sourceFile`, or `.jsonl` fields are not copied into suppressed metadata.

## Runtime Boundary

The bridge currently supports the storage-backed scope fields already present in `memory_records`:

- `projectId`
- `workspaceId`
- `clientId`
- `taskId`
- `conversationId`
- `visibility`
- `retentionPolicy`

The wider long-term scope tuple still includes user, agent, and folder semantics. Those remain future work because the current SQLite projection does not yet provide durable user/agent/folder columns for this bridge.

## Validation

Targeted validation passed:

- `node --check src\app.js`
- `node --check src\core\MemoryLifecycleScopeGovernanceContract.js`
- `node --check src\storage\SqliteShadowStore.js`
- `node --check tests\memory-lifecycle-scope-runtime-integration.test.js`
- `node --test tests\memory-lifecycle-scope-runtime-integration.test.js` (`3/3`)
- `node --test tests\memory-lifecycle-scope-governance-contract.test.js tests\memory-lifecycle-scope-read-policy-fixture.test.js tests\lifecycle-read-policy-runtime.test.js` (`20/20`)

The targeted tests cover:

- default-disabled behavior preserves existing results and performs no governance metadata lookup;
- enabled internal bridge suppresses proposal, malformed, and out-of-scope records;
- suppressed metadata excludes raw result fields;
- runtime `search_memory` post-results are filtered through the internal bridge without changing public arguments;
- existing lifecycle read-policy behavior and public MCP tool list remain unchanged.

## Review Notes

An initial test run failed for two useful reasons:

- malformed scope metadata was not propagated from runtime metadata to the helper;
- one integration test used public `args.scope`, which caused the older `applyScopeFilter()` to remove stubbed results before the new bridge.

Both issues were repaired narrowly:

- runtime candidate metadata now forwards `malformedLifecycle`, `malformedScope`, and `unresolvedRemediation`;
- the integration test now supplies internal scope through `executionContext`, leaving public argument behavior unchanged.

Final changed-scope re-review found no actionable finding in the implemented bridge/test scope.

## Remaining Gaps

This bridge is still bounded runtime integration only.

Open gaps:

- no default-on governance policy;
- no public MCP schema expansion;
- no durable governance state model for proposal / approval / supersession / tombstone / forget;
- no user / agent / folder durable scope projection;
- no candidate-cache invalidation proof for governance state changes;
- no true live real-store governance proof;
- no controlled live approval packet for governance actions;
- no memory recall reliability claim;
- no memory write reliability claim.

## Boundary

CM-0850 did not execute true live `record_memory`, true live `search_memory`, real memory scans, real memory content reads, direct real `.jsonl` reads, provider/model/API calls, durable memory/audit writes, cleanup apply, rollback apply, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup changes, tag/release/deploy/cutover, force push, branch rewrite, or readiness/reliability claims.

`RC_NOT_READY_BLOCKED` remains the controlling state.
