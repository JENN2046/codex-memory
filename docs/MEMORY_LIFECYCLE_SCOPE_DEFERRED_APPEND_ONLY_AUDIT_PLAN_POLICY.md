# Memory Lifecycle Scope Deferred Append-Only Audit Plan Policy

Date: `2026-05-24`
Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_APPEND_ONLY_AUDIT_PLAN_POLICY_COMPLETED_NOT_READY`
Decision: `RC_NOT_READY_BLOCKED`

## Purpose

Record a machine-checkable append-only audit plan policy contract for deferred lifecycle governance families:

- `memory_exclude`
- `memory_forget`

This is one missing prerequisite from the `CM-0909` deferred-family re-entry contract, following the `CM-0917` internal runtime-entry surface policy contract.

Added local helper/test:

- [DeferredGovernanceAppendOnlyAuditPlanPolicy.js](/A:/codex-memory/src/core/DeferredGovernanceAppendOnlyAuditPlanPolicy.js)
- [deferred-governance-append-only-audit-plan-policy.test.js](/A:/codex-memory/tests/deferred-governance-append-only-audit-plan-policy.test.js)

The helper is pure explicit input. It does not read files, run commands, start services, call providers, scan real memory, mutate durable state, expose raw private data, add MCP tools, approve execution, implement an audit writer, append audit events, or claim readiness.

## Policy

`memory_exclude` and `memory_forget` must not re-enter future runtime-entry review unless an append-only audit plan can describe the exact audit preview shape required before any durable governance apply.

Required audit phases:

- `pending`
- `committed`
- `cancelled`

Required audit event fields:

- `event_id`
- `correlation_id`
- `event_type`
- `audit_phase`
- `tool_name`
- `memory_ids`
- `actor_client_id`
- `request_source`
- `reason`
- `scope_tuple_ref`
- `mutation_applied`
- `redaction_applied`
- `rollback_ref`

Required audit plan outputs:

- `appendOnlyAuditPreview`
- `pendingEventPreview`
- `committedEventPreview`
- `cancelledEventPreview`
- `auditCorrelationId`
- `previousSnapshotRefs`
- `rollbackOrCleanupPlan`

Required family audit surfaces:

- `memory_exclude`: `event_type=memory_exclude`, `tool_name=internal_memory_exclude`
- `memory_forget`: `event_type=memory_forget`, `tool_name=internal_memory_forget`

Required approved-context pairings:

- `memory_exclude`: `requestSource=internal-memory-exclude-runtime-entry`, `contextFlag=internalMemoryExcludeRuntimeEntry`
- `memory_forget`: `requestSource=internal-memory-forget-runtime-entry`, `contextFlag=internalMemoryForgetRuntimeEntry`

Required audit plan flags:

- `appendOnlyRequired`
- `pendingBeforeMutationRequired`
- `committedAfterMutationRequired`
- `cancelledOnFailureRequired`
- `sharedCorrelationRequired`
- `redactionRequired`
- `previousSnapshotRefsRequired`
- `rollbackOrCleanupPlanRequired`
- `noOverwriteOrDelete`
- `noRawPayload`
- `publicMcpFrozen`

## Fail-closed Rules

The policy is rejected if:

- either deferred family is missing
- an unexpected family is substituted
- event type or internal tool name drifts
- request source drifts
- context flag drifts
- an audit phase is missing or unexpected
- an audit event field is missing or unexpected
- an audit plan output is missing or unexpected
- an audit plan flag is missing or unexpected
- append-only posture is not required
- pending-before-mutation is not required
- committed-after-mutation is not required
- cancelled-on-failure is not required
- shared correlation is not required
- redaction is not required
- overwrite or delete is allowed
- raw payload exposure is allowed
- public MCP exposure is claimed
- execution approval is claimed
- runtime integration is claimed
- audit writer implementation is claimed
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
- implement an audit writer
- append audit events
- produce a real runtime apply plan
- execute true live memory actions
- apply durable governance mutation
- read real memory or `.jsonl`
- call providers or external APIs
- change package, config, watchdog, or startup state
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC_READY`

## Validation

Targeted validation for this slice:

```powershell
node --check .\src\core\DeferredGovernanceAppendOnlyAuditPlanPolicy.js
node --check .\tests\deferred-governance-append-only-audit-plan-policy.test.js
node --test .\tests\deferred-governance-append-only-audit-plan-policy.test.js
```

Expected result: the append-only audit plan policy is accepted only when both deferred families require pending/committed/cancelled audit preview phases, exact event fields, shared correlation, redaction, previous snapshot refs, rollback/cleanup plan, no overwrite/delete, no raw payload, public MCP freeze, no audit writer implementation claim, and side-effect-free posture.

## Next Safe Step

Keep `memory_exclude` and `memory_forget` deferred. A future local-safe slice may add shadow projection policy or changed-memory-ids policy evidence without runtime apply or public tools.
