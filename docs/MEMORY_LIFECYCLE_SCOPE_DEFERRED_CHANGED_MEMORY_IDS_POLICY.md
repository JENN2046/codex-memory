# Memory Lifecycle Scope Deferred Changed Memory IDs Policy

Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_CHANGED_MEMORY_IDS_POLICY_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0920`

## Purpose

CM-0920 adds the next local-safe governance closure slice for deferred `memory_exclude` and `memory_forget`.

The new helper defines what a future changed-memory-ids plan must require before either family can be reviewed for runtime wiring. It is policy evidence only. It does not emit runtime changed ids, scan real memory, clear candidate cache, append audit events, add runtime entries, widen public MCP tools, execute a memory mutation, or claim recall/write/readiness reliability.

## Delivered Surfaces

CM-0920 adds:

- `src/core/DeferredGovernanceChangedMemoryIdsPolicy.js`
- `tests/deferred-governance-changed-memory-ids-policy.test.js`

The helper consumes an explicit policy packet and returns a fail-closed summary for the deferred governance families.

## Required Family Surfaces

The exact family changed-id surfaces are:

- `memory_exclude`: action `scope_suppression_changed_memory_ids`, change reason `excluded_scope_suppression`, emitted states `excluded` and `scope_suppressed`, request source `internal-memory-exclude-runtime-entry`, context flag `internalMemoryExcludeRuntimeEntry`
- `memory_forget`: action `governed_forget_changed_memory_ids`, change reason `forgotten_governance_suppression`, emitted states `forgotten` and `governance_suppressed`, request source `internal-memory-forget-runtime-entry`, context flag `internalMemoryForgetRuntimeEntry`

Any family substitution, action drift, change-reason drift, emitted-state drift, request-source drift, or context-flag drift keeps the policy rejected.

## Required Changed-ID Contract

Each future family plan must require these inputs:

- `targetMemoryIds`
- `projectionAffectedRecords`
- `auditCorrelationId`
- `governanceRevision`
- `scopeTuple`
- `requestSource`
- `contextFlag`
- `reason`
- `plannedAt`

Each future family plan must require these outputs:

- `changedMemoryIds`
- `changedMemoryIdSet`
- `changedMemoryIdCount`
- `changeReasonsByMemoryId`
- `auditChangedMemoryIds`
- `projectionChangedMemoryIds`
- `invalidationTargetMemoryIds`
- `governanceRevision`
- `candidateCacheInvalidationPlan`
- `readSuppressionRecheckPlan`
- `rollbackOrCleanupPlan`
- `blockingFindings`

The required flags keep changed-id emission exact and bounded:

- `exactTargetSetRequired`
- `dedupeRequired`
- `nonEmptyWhenTargetsPresent`
- `auditProjectionParityRequired`
- `governanceRevisionRequired`
- `candidateCacheInvalidationRequired`
- `readSuppressionRecheckRequired`
- `rollbackOrCleanupPlanRequired`
- `noBroadScanRequired`
- `publicMcpFrozen`

## Safety Boundary

The helper requires:

- explicit input only;
- internal review only;
- public MCP tools frozen to `record_memory`, `search_memory`, and `memory_overview`;
- no runtime mutation;
- no broad real-memory scan;
- no durable audit write;
- no durable memory write;
- no candidate-cache clear;
- no provider call;
- no service start;
- no config, package, remote, or readiness side effect;
- no raw secret, workspace id, or private memory exposure.

## Explicit Non-Claims

CM-0920 does not implement or authorize:

- runtime changed-id emission;
- broad memory scan;
- candidate-cache clear;
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

- `node --check src\core\DeferredGovernanceChangedMemoryIdsPolicy.js`
- `node --check tests\deferred-governance-changed-memory-ids-policy.test.js`
- `node --test tests\deferred-governance-changed-memory-ids-policy.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DEFERRED_CHANGED_MEMORY_IDS_POLICY_COMPLETED_NOT_READY`

The deferred governance lane now has a machine-checkable changed-memory-ids policy for `memory_exclude` and `memory_forget`, but runtime changed-id emission, durable apply, cache clear, live proof, and readiness remain blocked future work.
