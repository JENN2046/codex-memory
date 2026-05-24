# Memory Lifecycle Scope Deferred Approved-Context Gate Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_APPROVED_CONTEXT_GATE_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable approved-context gate policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0913` exact execution approval policy contract.

Added local helper/test:

- [DeferredGovernanceApprovedContextGatePolicy.js](/A:/codex-memory/src/core/DeferredGovernanceApprovedContextGatePolicy.js)
- [deferred-governance-approved-context-gate-policy.test.js](/A:/codex-memory/tests/deferred-governance-approved-context-gate-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, approve execution, integrate runtime entries, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not re-enter future runtime-entry review unless they inherit the same default-disabled, approved-context posture already used by the internal validate/tombstone/supersede gate family.

Required context fields:

- `requestSource`
- `contextFlag`
- `actorClientId`
- `approvalId`
- `auditCorrelationId`
- `scope`

Required family contexts:

- `memory_exclude`: `requestSource=internal-memory-exclude-runtime-entry`, `contextFlag=internalMemoryExcludeRuntimeEntry`
- `memory_forget`: `requestSource=internal-memory-forget-runtime-entry`, `contextFlag=internalMemoryForgetRuntimeEntry`

Required gate properties:

- `defaultDisabled`
- `requiresExactRequestSource`
- `requiresFamilyContextFlag`
- `requiresActorClientId`
- `requiresApprovalId`
- `requiresAuditCorrelationId`
- `requiresScopeBinding`
- `rejectsPublicMcpContext`
- `rejectsMissingExecutionContext`
- `rejectsStaleApprovalContext`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- request source drifts
- context flag drifts
- any required context field is missing
- any required gate property is missing
- default-disabled posture is not required
- exact request source is not required
- family context flag is not required
- actor client id is not required
- approval id is not required
- audit correlation id is not required
- scope binding is not required
- public MCP context is allowed
- missing execution context is allowed
- stale approval context is allowed
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
node --check .\src\core\DeferredGovernanceApprovedContextGatePolicy.js
node --check .\tests\deferred-governance-approved-context-gate-policy.test.js
node --test .\tests\deferred-governance-approved-context-gate-policy.test.js
```

Expected result: the approved-context gate policy is accepted only when both deferred families require default-disabled internal context gates with exact request source, exact context flag, actor, approval, audit correlation, scope binding, public-MCP rejection, missing-context rejection, and stale-context rejection.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add bounded runtime-prep evidence without implementing runtime apply or public tools.
