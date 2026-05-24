# Memory Lifecycle Scope Deferred Exact Execution Approval Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_EXACT_EXECUTION_APPROVAL_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable exact execution approval policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0912` candidate-cache invalidation policy contract.

Added local helper/test:

- [DeferredGovernanceExactExecutionApprovalPolicy.js](/A:/codex-memory/src/core/DeferredGovernanceExactExecutionApprovalPolicy.js)
- [deferred-governance-exact-execution-approval-policy.test.js](/A:/codex-memory/tests/deferred-governance-exact-execution-approval-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, approve execution, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not be executed from ambient authorization, blanket approval, public MCP calls, stale packets, dirty-worktree inference, runtime defaults, or implied continuation.

Required approval fields:

- `approvalId`
- `approvedFamily`
- `approvedAction`
- `approvedTargetMemoryIds`
- `approvedScope`
- `approvedActor`
- `approvedReason`
- `approvalTimestamp`
- `expiresAt`
- `auditCorrelationId`
- `rollbackOrCleanupPlan`

Denied approval shortcuts:

- `standing_authorization_only`
- `blanket_go_ahead`
- `dirty_worktree_inference`
- `public_mcp_call`
- `runtime_default`
- `stale_packet_reuse`

Required family-specific approval actions:

- `memory_exclude`: `exclude_scope_suppression`
- `memory_forget`: `forget_governed_suppression`

Required policy flags:

- `exactExecutionApprovalRequired`
- `familySpecificApprovalRequired`
- `targetMemoryIdsRequired`
- `scopeBindingRequired`
- `actorAndReasonRequired`
- `expiryRequired`
- `auditCorrelationRequired`
- `rollbackOrCleanupPlanRequired`
- `noBundledApproval`
- `noImplicitExecution`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- a family-specific action is missing or swapped
- any required approval field is missing
- any denied approval shortcut is omitted
- exact execution approval is not required
- family-specific approval is not required
- target memory ids are not required
- scope binding is not required
- approval expiry is not required
- audit correlation is not required
- rollback or cleanup plan is not required
- implicit approval is allowed
- bundled approval is allowed
- wildcard target approval is allowed
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
node --check .\src\core\DeferredGovernanceExactExecutionApprovalPolicy.js
node --check .\tests\deferred-governance-exact-execution-approval-policy.test.js
node --test .\tests\deferred-governance-exact-execution-approval-policy.test.js
```

Expected result: the exact execution approval policy is accepted only when both deferred families require a fresh family-specific approval packet with exact target ids, scope, actor/reason, expiry, audit correlation, rollback/cleanup plan, and explicit rejection of blanket or implicit approval paths.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add approved-context gate evidence or bounded runtime-prep evidence without implementing runtime apply or public tools.
