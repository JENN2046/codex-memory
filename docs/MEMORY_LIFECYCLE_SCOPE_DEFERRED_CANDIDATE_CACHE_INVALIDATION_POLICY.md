# Memory Lifecycle Scope Deferred Candidate-Cache Invalidation Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_CANDIDATE_CACHE_INVALIDATION_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable candidate-cache invalidation policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0911` scope/pollution read-policy contract.

Added local helper/test:

- [DeferredGovernanceCandidateCacheInvalidationPolicy.js](/A:/codex-memory/src/core/DeferredGovernanceCandidateCacheInvalidationPolicy.js)
- [deferred-governance-candidate-cache-invalidation-policy.test.js](/A:/codex-memory/tests/deferred-governance-candidate-cache-invalidation-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not leave stale candidate-cache entries that can reintroduce suppressed records after a future governance mutation.

Required invalidation triggers:

- `governance_revision_changed`
- `changed_memory_ids_emitted`
- `suppression_state_changed`
- `scope_boundary_changed`

Required invalidation scopes:

- `current_embedding_fingerprint`
- `dependent_candidate_entries`
- `target_family_fallback`
- `cache_hit_projection_recheck`

Required target families:

- `process`
- `knowledge`
- `both`

Required policy flags:

- `changedMemoryIdsRequired`
- `governanceRevisionRequired`
- `dependentCandidateEntriesCleared`
- `targetFamilyFallbackRequired`
- `cacheHitProjectionRechecked`
- `staleSuppressedCacheReuseBlocked`
- `scopeBoundaryInvalidatesCache`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- any required invalidation trigger is missing
- any required invalidation scope is missing
- any target family is missing
- changed memory ids are not required
- governance revision emission is not required
- dependent candidate entries are not cleared
- target-family fallback is not required
- cache-hit projection is not rechecked
- stale suppressed cache reuse is allowed
- scope-boundary drift does not invalidate cache
- public MCP expansion is claimed
- runtime integration is claimed
- durable mutation is claimed
- provider calls are reported
- readiness is claimed
- side-effect safety flags are not all clear

## Boundary

This policy does not:

- implement `memory_exclude`
- implement `memory_forget`
- add public MCP tools
- widen `callTool()`
- change `TOOL_DEFINITIONS`
- execute true live memory actions
- apply durable governance mutation
- clear real candidate-cache entries
- append durable audit events
- read real memory or `.jsonl`
- call providers or external APIs
- change package, config, watchdog, or startup state
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC_READY`

## Validation

Targeted validation for this slice:

```powershell
node --check .\src\core\DeferredGovernanceCandidateCacheInvalidationPolicy.js
node --check .\tests\deferred-governance-candidate-cache-invalidation-policy.test.js
node --test .\tests\deferred-governance-candidate-cache-invalidation-policy.test.js
```

Expected result: the candidate-cache invalidation policy is accepted only when both deferred families require changed memory ids, governance revision, dependent-entry clearing, target-family fallback, cache-hit projection recheck, public-MCP freeze, and side-effect-free posture.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add bounded runtime-prep evidence or exact approval gating evidence without implementing runtime apply or public tools.
