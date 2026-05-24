# Memory Lifecycle Scope Deferred Scope Pollution Read Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_SCOPE_POLLUTION_READ_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable scope/pollution read-policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract.

Added local helper/test:

- [DeferredGovernanceScopePollutionReadPolicy.js](/A:/codex-memory/src/core/DeferredGovernanceScopePollutionReadPolicy.js)
- [deferred-governance-scope-pollution-read-policy.test.js](/A:/codex-memory/tests/deferred-governance-scope-pollution-read-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not pollute ordinary recall once their deferred families become eligible for future internal re-entry review.

The policy requires normal recall, candidate generation, and cache-hit projection to block these suppressed states:

- `excluded`
- `forgotten`
- `scope_suppressed`
- `governance_suppressed`

The only allowed review contexts are governance-only contexts:

- `append_only_audit_review`
- `governance_admin_review`

Required policy flags:

- `normalRecallBlocksSuppressedRecords`
- `candidateGenerationBlocksSuppressedRecords`
- `cacheHitProjectionBlocksSuppressedRecords`
- `governanceAuditOnlyReviewAllowed`
- `rawContentNotExposedForSuppressedRecords`
- `scopeMismatchFailsClosed`
- `pollutionCountersRequired`
- `candidateCacheInvalidationRequired`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- any required suppressed state is not blocked
- any required read context is not blocked
- normal recall can return suppressed records
- candidate generation can return suppressed records
- cache-hit projection can reintroduce suppressed records
- scope mismatch does not fail closed
- pollution counters are not required
- raw content exposure is claimed
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
node --check .\src\core\DeferredGovernanceScopePollutionReadPolicy.js
node --check .\tests\deferred-governance-scope-pollution-read-policy.test.js
node --test .\tests\deferred-governance-scope-pollution-read-policy.test.js
```

Expected result: the scope/pollution read policy is accepted only when both deferred families are ordinary-recall-blocked, candidate-generation-blocked, cache-hit-projection-blocked, governance-review-only, public-MCP-frozen, and side-effect-free.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add another missing prerequisite, such as candidate-cache invalidation evidence or bounded runtime-prep evidence, without implementing runtime apply or public tools.
