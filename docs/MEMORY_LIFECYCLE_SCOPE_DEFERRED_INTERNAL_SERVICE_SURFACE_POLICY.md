# Memory Lifecycle Scope Deferred Internal Service Surface Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_INTERNAL_SERVICE_SURFACE_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable internal service surface policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0915` bounded runtime-prep policy contract.

Added local helper/test:

- [DeferredGovernanceInternalServiceSurfacePolicy.js](/A:/codex-memory/src/core/DeferredGovernanceInternalServiceSurfacePolicy.js)
- [deferred-governance-internal-service-surface-policy.test.js](/A:/codex-memory/tests/deferred-governance-internal-service-surface-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, approve execution, integrate runtime entries, implement service classes, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not re-enter future runtime-entry review unless an internal service surface can describe the exact default-disabled service shape that would sit below a future internal runtime entry.

Required service inputs:

- `targetMemoryIds`
- `scopeTuple`
- `actorClientId`
- `approvalId`
- `requestSource`
- `contextFlag`
- `reason`
- `auditCorrelationId`
- `dryRun`

Required service outputs:

- `decision`
- `dryRun`
- `mutated`
- `family`
- `targetMemoryIds`
- `suppressionProjectionPreview`
- `appendOnlyAuditPreview`
- `changedMemoryIds`
- `governanceRevision`
- `candidateCacheInvalidation`
- `readPolicySuppression`
- `rollbackOrCleanupPlan`

Required service dependencies:

- `shadowProjectionReader`
- `auditPreviewBuilder`
- `candidateCacheInvalidationPlanner`
- `readPolicySuppressionPlanner`
- `approvalContextGate`
- `runtimePrepPolicy`

Required family surfaces:

- `memory_exclude`: `MemoryExcludeGovernanceService.planMemoryExclude`
- `memory_forget`: `MemoryForgetGovernanceService.planMemoryForget`

Required approved-context pairings:

- `memory_exclude`: `requestSource=internal-memory-exclude-runtime-entry`, `contextFlag=internalMemoryExcludeRuntimeEntry`
- `memory_forget`: `requestSource=internal-memory-forget-runtime-entry`, `contextFlag=internalMemoryForgetRuntimeEntry`

Required actions and projection states:

- `memory_exclude`: `scope_suppression_projection`; `excluded`, `scope_suppressed`
- `memory_forget`: `governed_forget_suppression_projection`; `forgotten`, `governance_suppressed`

Required service flags:

- `internalOnly`
- `defaultDisabled`
- `dryRunFirst`
- `boundedRuntimePrepRequired`
- `approvedContextGateRequired`
- `exactExecutionApprovalRequired`
- `appendOnlyAuditPreviewRequired`
- `shadowProjectionPreviewRequired`
- `changedMemoryIdsRequired`
- `governanceRevisionRequired`
- `candidateCacheInvalidationRequired`
- `readPolicySuppressionRequired`
- `rollbackOrCleanupPlanRequired`
- `noHardDeleteDefault`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- a service name or method is swapped
- a family action is missing or swapped
- a required projection state is missing or swapped
- request source drifts
- context flag drifts
- any required service input is missing
- any required service output is missing
- any required service dependency is missing
- any required service flag is missing
- the service is not internal-only
- the service is not default-disabled
- dry-run-first posture is not required
- runtime entry is enabled by default
- public MCP exposure is claimed
- execution approval is claimed
- runtime integration is claimed
- durable mutation is claimed
- hard delete is allowed
- provider calls are reported
- readiness is claimed
- side-effect safety flags are not all clear

## Boundary

This policy does not:

- implement `MemoryExcludeGovernanceService`
- implement `MemoryForgetGovernanceService`
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
node --check .\src\core\DeferredGovernanceInternalServiceSurfacePolicy.js
node --check .\tests\deferred-governance-internal-service-surface-policy.test.js
node --test .\tests\deferred-governance-internal-service-surface-policy.test.js
```

Expected result: the internal service surface policy is accepted only when both deferred families require exact internal service names and methods, default-disabled dry-run-first posture, approved context, exact execution approval, bounded runtime-prep, audit/projection previews, changed ids, governance revision, candidate-cache invalidation, read-policy suppression, rollback/cleanup, public-MCP freeze, no-hard-delete default, and side-effect-free posture.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add an internal runtime-entry surface contract or append-only audit/shadow-projection policy evidence without runtime apply or public tools.
