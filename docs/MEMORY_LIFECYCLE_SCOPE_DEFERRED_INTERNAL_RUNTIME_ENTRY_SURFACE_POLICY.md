# Memory Lifecycle Scope Deferred Internal Runtime-Entry Surface Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_INTERNAL_RUNTIME_ENTRY_SURFACE_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable internal runtime-entry surface policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0916` internal service surface policy contract.

Added local helper/test:

- [DeferredGovernanceInternalRuntimeEntrySurfacePolicy.js](/A:/codex-memory/src/core/DeferredGovernanceInternalRuntimeEntrySurfacePolicy.js)
- [deferred-governance-internal-runtime-entry-surface-policy.test.js](/A:/codex-memory/tests/deferred-governance-internal-runtime-entry-surface-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, widen `callTool()`, approve execution, integrate runtime entries, implement service classes, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not re-enter future runtime-entry review unless an internal runtime-entry surface can describe the exact default-disabled entry shape above a future internal service.

Required entry inputs:

- `args`
- `requestContext`
- `executionContext`
- `requestSource`
- `contextFlag`
- `actorClientId`
- `approvalId`
- `auditCorrelationId`
- `dryRun`

Required payload fields:

- `target_memory_ids`
- `scope_tuple`
- `actor_client_id`
- `approval_id`
- `request_source`
- `context_flag`
- `reason`
- `audit_correlation_id`
- `dry_run`

Required entry outputs:

- `ok`
- `reason`
- `payload`
- `blockedBeforeService`
- `serviceName`
- `serviceMethod`
- `executionStarted`
- `mutated`

Required family runtime-entry surfaces:

- `memory_exclude`: `executeInternalMemoryExclude -> MemoryExcludeGovernanceService.planMemoryExclude`
- `memory_forget`: `executeInternalMemoryForget -> MemoryForgetGovernanceService.planMemoryForget`

Required approved-context pairings:

- `memory_exclude`: `requestSource=internal-memory-exclude-runtime-entry`, `contextFlag=internalMemoryExcludeRuntimeEntry`
- `memory_forget`: `requestSource=internal-memory-forget-runtime-entry`, `contextFlag=internalMemoryForgetRuntimeEntry`

Required entry flags:

- `defaultDisabled`
- `approvedExecutionContextRequired`
- `exactRequestSourceRequired`
- `familyContextFlagRequired`
- `actorClientIdDerivedFromContext`
- `dryRunDefaultTrue`
- `confirmRequiresExactApproval`
- `routesOnlyToInternalService`
- `boundedRuntimePrepRequired`
- `publicMcpFrozen`
- `noPublicCallToolExposure`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- an entry name is swapped
- a service name or method is swapped
- request source drifts
- context flag drifts
- any required entry input is missing
- any required payload field is missing
- any required entry output is missing
- any required entry flag is missing
- the entry is not default-disabled
- approved execution context is not required
- public MCP exposure is claimed
- public `callTool()` exposure is claimed
- execution approval is claimed
- runtime integration is claimed
- service implementation is claimed
- execution start is claimed
- durable mutation is claimed
- provider calls are reported
- readiness is claimed
- side-effect safety flags are not all clear

## Boundary

This policy does not:

- implement `executeInternalMemoryExclude`
- implement `executeInternalMemoryForget`
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
node --check .\src\core\DeferredGovernanceInternalRuntimeEntrySurfacePolicy.js
node --check .\tests\deferred-governance-internal-runtime-entry-surface-policy.test.js
node --test .\tests\deferred-governance-internal-runtime-entry-surface-policy.test.js
```

Expected result: the internal runtime-entry surface policy is accepted only when both deferred families require exact internal entry names, exact service routing, default-disabled approved-context gating, dry-run defaulting, bounded runtime-prep, public MCP freeze, no public `callTool()` exposure, no service implementation claim, no execution start, and side-effect-free posture.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add append-only audit plan, shadow projection policy, or changed-memory-ids policy evidence without runtime apply or public tools.
