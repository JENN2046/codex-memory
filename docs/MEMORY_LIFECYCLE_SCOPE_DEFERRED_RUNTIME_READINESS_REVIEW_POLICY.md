# Memory Lifecycle Scope Deferred Runtime Readiness Review Policy

Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_RUNTIME_READINESS_REVIEW_POLICY_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0982`

## Purpose

CM-0982 adds the next local-safe governance closure slice for deferred `memory_exclude` and `memory_forget`.

The new helper defines the exact evidence shape a future runtime-readiness review must inspect before either family can be considered for runtime wiring. It is review-policy evidence only. It does not start a service, execute a runtime probe, run live recall or write proof, mutate durable memory/audit state, clear candidate cache, call a provider, widen public MCP tools, or claim runtime/readiness/reliability.

## Delivered Surfaces

CM-0982 adds:

- `src/core/DeferredGovernanceRuntimeReadinessReviewPolicy.js`
- `tests/deferred-governance-runtime-readiness-review-policy.test.js`

The helper consumes an explicit policy packet and returns a fail-closed summary for the deferred governance families.

## Required Family Surfaces

The exact family runtime-review surfaces are:

- `memory_exclude`: action `scope_suppression_runtime_readiness_review`, review reason `excluded_scope_suppression_runtime_review`, decision state `not_runtime_ready`, request source `internal-memory-exclude-runtime-entry`, context flag `internalMemoryExcludeRuntimeEntry`
- `memory_forget`: action `governed_forget_runtime_readiness_review`, review reason `forgotten_governance_suppression_runtime_review`, decision state `not_runtime_ready`, request source `internal-memory-forget-runtime-entry`, context flag `internalMemoryForgetRuntimeEntry`

Any family substitution, action drift, review-reason drift, decision-state drift, request-source drift, or context-flag drift keeps the policy rejected.

## Required Runtime Review Contract

Each future family review must require these inputs:

- `internalRuntimeEntrySurfaceRef`
- `internalServiceSurfaceRef`
- `exactExecutionApprovalRef`
- `approvedContextGateRef`
- `boundedRuntimePrepRef`
- `appendOnlyAuditPlanRef`
- `shadowProjectionRef`
- `changedMemoryIdsRef`
- `governanceRevisionRef`
- `candidateCacheInvalidationRef`
- `readSuppressionPolicyRef`
- `rollbackOrCleanupRef`
- `noHardDeletePolicyRef`
- `publicMcpFreezeRef`
- `validationEvidenceRef`

Each future family review must require these outputs:

- `runtimeReviewDecision`
- `requiredEvidenceRefs`
- `missingEvidenceRefs`
- `blockingFindings`
- `allowedNextStep`
- `deniedActions`
- `dirtyBaselineBlockers`
- `readinessClaimAllowed`

The required flags keep runtime review bounded and non-claiming:

- `allPrerequisitePoliciesRequired`
- `exactFamilySurfaceRequired`
- `dryRunBeforeApplyRequired`
- `explicitApprovalRequired`
- `auditProjectionChangedIdsRevisionRequired`
- `candidateCacheReadSuppressionRequired`
- `rollbackOrCleanupRequired`
- `dirtyBaselineBlocksLiveProof`
- `publicMcpFrozen`
- `readinessClaimBlocked`

The denied runtime actions are fixed:

- `runtimeIntegration`
- `serviceStart`
- `liveRecallProof`
- `liveWriteProof`
- `durableMemoryWrite`
- `durableAuditWrite`
- `candidateCacheClear`
- `providerCall`
- `publicMcpExpansion`
- `configMutation`
- `readinessClaim`

## Safety Boundary

The helper requires:

- explicit input only;
- internal review only;
- public MCP tools frozen to `record_memory`, `search_memory`, and `memory_overview`;
- no runtime integration;
- no service start;
- no runtime probe;
- no live memory proof;
- no durable audit write;
- no durable memory write;
- no candidate-cache clear;
- no provider call;
- no config, package, remote, or readiness side effect;
- no raw secret, workspace id, or private memory exposure.

## Explicit Non-Claims

CM-0982 does not implement or authorize:

- runtime entry wiring;
- runtime service implementation;
- `src/app.js` / `callTool()` changes;
- HTTP MCP startup or observe;
- live recall proof;
- live write proof;
- Provider-backed evidence;
- durable projection apply;
- SQLite writes;
- audit writer execution;
- candidate-cache clear;
- public MCP governance tools;
- true memory reads or writes;
- `memory recall reliable`;
- `memory write reliable`;
- `RC_READY`, runtime readiness, or production readiness.

## Validation

Validated with:

- `node --check src\core\DeferredGovernanceRuntimeReadinessReviewPolicy.js`
- `node --check tests\deferred-governance-runtime-readiness-review-policy.test.js`
- `node --test tests\deferred-governance-runtime-readiness-review-policy.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DEFERRED_RUNTIME_READINESS_REVIEW_POLICY_COMPLETED_NOT_READY`

The deferred governance lane now has a machine-checkable runtime-readiness review policy for `memory_exclude` and `memory_forget`, but runtime integration, service start, live proof, durable apply, cache clear, and readiness remain blocked future work.
