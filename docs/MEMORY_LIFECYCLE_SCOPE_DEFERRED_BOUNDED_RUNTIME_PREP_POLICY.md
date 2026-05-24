# Memory Lifecycle Scope Deferred Bounded Runtime-Prep Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_BOUNDED_RUNTIME_PREP_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable bounded runtime-prep policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0914` approved-context gate policy contract.

Added local helper/test:

- [DeferredGovernanceBoundedRuntimePrepPolicy.js](/A:/codex-memory/src/core/DeferredGovernanceBoundedRuntimePrepPolicy.js)
- [deferred-governance-bounded-runtime-prep-policy.test.js](/A:/codex-memory/tests/deferred-governance-bounded-runtime-prep-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, approve execution, integrate runtime entries, produce a real apply plan, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not re-enter future runtime-entry review unless a bounded runtime-prep surface can describe the dry-run-only outputs that would be required before any real apply.

Required runtime-prep fields:

- `targetMemoryIds`
- `scopeTuple`
- `actorClientId`
- `approvalId`
- `requestSource`
- `contextFlag`
- `reason`
- `auditCorrelationId`
- `plannedAt`

Required runtime-prep outputs:

- `suppressionProjectionPreview`
- `appendOnlyAuditPreview`
- `changedMemoryIds`
- `governanceRevision`
- `candidateCacheInvalidation`
- `readPolicySuppression`
- `rollbackOrCleanupPlan`

Required family runtime-prep actions:

- `memory_exclude`: `scope_suppression_projection`
- `memory_forget`: `governed_forget_suppression_projection`

Required family projection states:

- `memory_exclude`: `excluded`, `scope_suppressed`
- `memory_forget`: `forgotten`, `governance_suppressed`

Required approved-context pairings:

- `memory_exclude`: `requestSource=internal-memory-exclude-runtime-entry`, `contextFlag=internalMemoryExcludeRuntimeEntry`
- `memory_forget`: `requestSource=internal-memory-forget-runtime-entry`, `contextFlag=internalMemoryForgetRuntimeEntry`

Required policy flags:

- `dryRunOnly`
- `runtimeApplyBlocked`
- `approvedContextGateRequired`
- `exactExecutionApprovalRequired`
- `appendOnlyAuditPreviewRequired`
- `shadowProjectionPreviewRequired`
- `changedMemoryIdsRequired`
- `governanceRevisionRequired`
- `candidateCacheInvalidationRequired`
- `readPolicySuppressionRequired`
- `rollbackOrCleanupPlanRequired`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- a family runtime-prep action is missing or swapped
- a required projection state is missing or swapped
- request source drifts
- context flag drifts
- any required runtime-prep field is missing
- any required runtime-prep output is missing
- dry-run-only posture is not required
- runtime apply is not blocked
- approved-context gate is not required
- exact execution approval is not required
- append-only audit preview is not required
- shadow projection preview is not required
- changed memory ids are not required
- governance revision is not required
- candidate-cache invalidation is not required
- read-policy suppression is not required
- rollback or cleanup plan is not required
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
- approve `memory_exclude`
- approve `memory_forget`
- add public MCP tools
- widen `callTool()`
- change `TOOL_DEFINITIONS`
- add runtime entry functions
- produce a real runtime apply plan
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
node --check .\src\core\DeferredGovernanceBoundedRuntimePrepPolicy.js
node --check .\tests\deferred-governance-bounded-runtime-prep-policy.test.js
node --test .\tests\deferred-governance-bounded-runtime-prep-policy.test.js
```

Expected result: the bounded runtime-prep policy is accepted only when both deferred families require dry-run-only prep fields and outputs that bind approved context, exact execution approval, append-only audit preview, shadow projection preview, changed ids, governance revision, candidate-cache invalidation, read-policy suppression, rollback/cleanup, public-MCP freeze, and side-effect-free posture.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add an internal service implementation candidate or internal runtime-entry surface contract without runtime apply or public tools.
