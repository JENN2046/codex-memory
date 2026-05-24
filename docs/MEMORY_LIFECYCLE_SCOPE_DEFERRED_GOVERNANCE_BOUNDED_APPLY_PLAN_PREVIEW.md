# MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_BOUNDED_APPLY_PLAN_PREVIEW

Status: `COMPLETED_VALIDATED_LOCAL_COMMIT_NOT_READY`

Current commit task: `CM-0985`

Original candidate lineage: `CM-0929`

## Scope

CM-0929 adds a fail-closed, explicit-input bounded apply-plan preview helper for the deferred governance families:

- `memory_exclude`
- `memory_forget`

The helper consumes the CM-0924 dry-run planning surface and explicit runtime-surface capability evidence. It translates accepted dry-run plans into an internal apply-plan preview shape while keeping execution blocked.

It does not inspect files, start services, execute app methods, run HTTP MCP, call providers, read real memory, write durable memory/audit state, clear candidate cache, widen `callTool()`, expand public MCP, or claim readiness.

## Delivered Surface

- `src/core/DeferredGovernanceBoundedApplyPlanPreview.js`
- `tests/deferred-governance-bounded-apply-plan-preview.test.js`

The helper returns:

- `acceptedForApplyPlanPreview`
- `decision`
- `previewId`
- `applyPlanPreview`
- `runtimeSurface`
- `blockers`
- `publicMcpTools`
- `safety`

Accepted previews still force:

- `executionApproved=false`
- `runtimeApplyBlocked=true`
- `runtimeIntegrated=false`
- `mutated=false`
- `durableAuditWritten=false`
- `durableProjectionApplied=false`
- `candidateCacheCleared=false`
- `publicMcpExpanded=false`
- `readinessClaimed=false`

## Required Runtime Surface Evidence

Accepted input must provide explicit capability evidence for:

- suppression projection preview
- append-only audit preview
- governance revision preview
- changed memory ids preview
- candidate-cache invalidation preview
- read-policy suppression preview
- rollback/cleanup preview
- public MCP freeze with exactly `record_memory`, `search_memory`, and `memory_overview`

Missing capability evidence fails closed.

## Apply-Plan Preview Shape

When accepted, the preview contains ordered internal steps:

- `verify_approved_internal_context`
- `append_pending_audit_preview`
- `apply_shadow_suppression_projection_blocked`
- `emit_governance_revision_preview`
- `invalidate_target_candidate_cache_preview`
- `activate_read_policy_suppression_preview`
- `append_committed_or_cancelled_audit_preview`

These are review steps only. They are not executed.

## Fail-Closed Boundaries

The helper rejects:

- schema drift
- unsupported governance family
- missing `previewOnly`
- public MCP expansion
- `callTool()` widening
- runtime apply requests
- `dryRun=false`
- `confirm=true`
- readiness claims
- rejected CM-0924 dry-run plans
- incomplete runtime-surface capability evidence
- public MCP tool drift
- secret-like input via the underlying dry-run planner

Normalized preview input redacts sensitive string fragments for reporting, while the execution path still passes the raw dry-run payload to the CM-0924 planner so secret-like input can fail closed before redacted output is produced.

## Validation

Validated with:

```powershell
node --check .\src\core\DeferredGovernanceBoundedApplyPlanPreview.js
node --check .\tests\deferred-governance-bounded-apply-plan-preview.test.js
node --test .\tests\deferred-governance-bounded-apply-plan-preview.test.js
node --test .\tests\deferred-governance-mutation-planning-service.test.js
node --test .\tests\deferred-governance-app-runtime-entry.test.js
git diff --check
```

Targeted coverage proves:

- accepted `memory_exclude` preview remains no-apply/no-mutation;
- accepted `memory_forget` preview preserves forget suppression states;
- incomplete runtime-surface evidence and public MCP drift fail closed;
- runtime apply, family drift, and readiness claims fail closed;
- secret-like content fails closed and normalized preview input is redacted;
- no implicit filesystem reads occur while building the preview.

CM-0985 reran this narrow gate before local commit consideration because CM-0984 now depends on this module.

## Not Claimed

This is not runtime apply readiness.

This does not prove live `memory_exclude`, live `memory_forget`, durable governance mutation, candidate-cache clearing, HTTP MCP behavior, donor compatibility changes, `memory recall reliable`, `memory write reliable`, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains controlling until later runtime proof closes with clean-baseline evidence.
