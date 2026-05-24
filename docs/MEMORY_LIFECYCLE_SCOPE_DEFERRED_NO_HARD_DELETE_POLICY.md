# Memory Lifecycle Scope Deferred No-hard-delete Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_NO_HARD_DELETE_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable no-hard-delete default policy for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract.

Added local helper/test:

- [DeferredGovernanceNoHardDeletePolicy.js](/A:/codex-memory/src/core/DeferredGovernanceNoHardDeletePolicy.js)
- [deferred-governance-no-hard-delete-policy.test.js](/A:/codex-memory/tests/deferred-governance-no-hard-delete-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must default to non-destructive governance behavior.

Allowed default actions:

- `scope_suppression`
- `governed_tombstone`
- `governed_suppression_then_review`

Required policy flags:

- `noHardDeleteDefault`
- `suppressionFirst`
- `appendOnlyAuditRequired`
- `exactApprovalRequiredForDestructiveDelete`
- `publicMcpFrozen`
- `readPolicyBlocksSuppressedRecords`
- `candidateCacheInvalidationRequired`
- `rollbackOrSupersessionPathRequired`

Hard delete is not a default behavior for either family.

Any future destructive deletion requires a separate exact approval and must not be inferred from this policy.

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- default action is `hard_delete`
- hard delete is allowed by default
- destructive delete lacks exact-approval requirement
- append-only audit is not required
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
- authorize destructive delete
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
node --check .\src\core\DeferredGovernanceNoHardDeletePolicy.js
node --check .\tests\deferred-governance-no-hard-delete-policy.test.js
node --test .\tests\deferred-governance-no-hard-delete-policy.test.js
```

Expected result: the no-hard-delete default policy is accepted only when both deferred families are non-destructive by default, audit-bound, exact-approval-bound for destructive delete, public-MCP-frozen, and side-effect-free.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add another missing prerequisite, such as scope/pollution read-policy evidence or candidate-cache invalidation evidence, without implementing runtime apply or public tools.
