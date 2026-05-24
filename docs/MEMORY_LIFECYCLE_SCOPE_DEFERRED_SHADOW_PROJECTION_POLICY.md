# Memory Lifecycle Scope Deferred Shadow Projection Policy

Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_SHADOW_PROJECTION_POLICY_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0980`

## Purpose

CM-0980 adds the next local-safe governance closure slice for deferred `memory_exclude` and `memory_forget`.

The new helper defines what a future suppression-style shadow projection plan must require before either family can be reviewed for runtime wiring. It is policy evidence only. It does not apply SQLite projection changes, append audit events, add runtime entries, widen public MCP tools, execute a memory mutation, or claim recall/write/readiness reliability.

## Delivered Surfaces

CM-0980 adds:

- `src/core/DeferredGovernanceShadowProjectionPolicy.js`
- `tests/deferred-governance-shadow-projection-policy.test.js`

The helper consumes an explicit policy packet and returns a fail-closed summary for the deferred governance families.

## Required Family Surfaces

The exact family projection surfaces are:

- `memory_exclude`: action `scope_suppression_projection`, projection states `excluded` and `scope_suppressed`, request source `internal-memory-exclude-runtime-entry`, context flag `internalMemoryExcludeRuntimeEntry`
- `memory_forget`: action `governed_forget_suppression_projection`, projection states `forgotten` and `governance_suppressed`, request source `internal-memory-forget-runtime-entry`, context flag `internalMemoryForgetRuntimeEntry`

Any family substitution, action drift, projection-state drift, request-source drift, or context-flag drift keeps the policy rejected.

## Required Projection Contract

Each future family plan must require these projection inputs:

- `targetMemoryIds`
- `scopeTuple`
- `currentProjectionRecords`
- `plannedAt`
- `actorClientId`
- `requestSource`
- `contextFlag`
- `reason`
- `auditCorrelationId`

Each future family plan must require these projection outputs:

- `suppressionProjectionPreview`
- `affectedRecords`
- `beforeSqliteColumns`
- `afterSqliteColumns`
- `fieldChangesSqliteColumns`
- `projectedChangedMemoryIds`
- `projectedGovernanceRevision`
- `projectedRevisionToken`
- `scopeVerification`
- `blockingFindings`
- `rollbackOrCleanupPlan`

Each future family plan must map at least these SQLite projection columns:

- `status`
- `status_reason`
- `lifecycle_updated_at`
- `lifecycle_actor_client_id`
- `governance_revision`
- `suppression_reason`
- `suppression_scope_hash`
- `suppression_audit_correlation_id`
- `read_suppression_state`
- `candidate_cache_revision`

The required flags keep the path dry-run-first and fail-closed:

- `shadowProjectionPreviewRequired`
- `durableProjectionApplyBlocked`
- `sqliteColumnMappingRequired`
- `beforeAfterPreviewRequired`
- `scopeVerificationRequired`
- `projectedChangedMemoryIdsRequired`
- `governanceRevisionRequired`
- `candidateCacheRevisionRequired`
- `readSuppressionStateRequired`
- `rollbackOrCleanupPlanRequired`
- `publicMcpFrozen`

## Safety Boundary

The helper requires:

- explicit input only;
- internal review only;
- public MCP tools frozen to `record_memory`, `search_memory`, and `memory_overview`;
- no runtime mutation;
- no durable projection apply;
- no durable audit write;
- no durable memory write;
- no provider call;
- no service start;
- no config, package, remote, or readiness side effect;
- no raw secret, workspace id, or private memory exposure.

## Explicit Non-Claims

CM-0980 does not implement or authorize:

- durable projection apply;
- SQLite writes;
- audit writer implementation;
- runtime service or runtime entry wiring;
- `src/app.js` / `callTool()` changes;
- public MCP governance tools;
- true memory reads or writes;
- live recall or write proof;
- `memory recall reliable`;
- `memory write reliable`;
- `RC_READY` or production readiness.

## Validation

Validated with:

- `node --check src\core\DeferredGovernanceShadowProjectionPolicy.js`
- `node --check tests\deferred-governance-shadow-projection-policy.test.js`
- `node --test tests\deferred-governance-shadow-projection-policy.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DEFERRED_SHADOW_PROJECTION_POLICY_COMPLETED_NOT_READY`

The deferred governance lane now has a machine-checkable shadow projection policy for `memory_exclude` and `memory_forget`, but runtime projection, durable apply, live proof, and readiness remain blocked future work.
