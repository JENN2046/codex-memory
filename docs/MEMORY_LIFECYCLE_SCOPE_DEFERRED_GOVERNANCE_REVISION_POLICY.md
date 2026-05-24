# Memory Lifecycle Scope Deferred Governance Revision Policy

Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_REVISION_POLICY_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0981`

## Purpose

CM-0981 adds the next local-safe governance closure slice for deferred `memory_exclude` and `memory_forget`.

The new helper defines what a future governance-revision plan must require before either family can be reviewed for runtime wiring. It is policy evidence only. It does not implement a revision emitter, scan real memory, clear candidate cache, append audit events, add runtime entries, widen public MCP tools, execute a memory mutation, or claim recall/write/readiness reliability.

## Delivered Surfaces

CM-0981 adds:

- `src/core/DeferredGovernanceRevisionPolicy.js`
- `tests/deferred-governance-revision-policy.test.js`

The helper consumes an explicit policy packet and returns a fail-closed summary for the deferred governance families.

## Required Family Surfaces

The exact family governance-revision surfaces are:

- `memory_exclude`: action `scope_suppression_governance_revision`, revision reason `excluded_scope_suppression_revision`, revision states `excluded` and `scope_suppressed`, request source `internal-memory-exclude-runtime-entry`, context flag `internalMemoryExcludeRuntimeEntry`
- `memory_forget`: action `governed_forget_governance_revision`, revision reason `forgotten_governance_suppression_revision`, revision states `forgotten` and `governance_suppressed`, request source `internal-memory-forget-runtime-entry`, context flag `internalMemoryForgetRuntimeEntry`

Any family substitution, action drift, revision-reason drift, revision-state drift, request-source drift, or context-flag drift keeps the policy rejected.

## Required Revision Contract

Each future family plan must require these inputs:

- `targetMemoryIds`
- `changedMemoryIds`
- `auditCorrelationId`
- `projectionRevisionToken`
- `candidateCacheRevision`
- `readSuppressionRevision`
- `scopeTuple`
- `requestSource`
- `contextFlag`
- `plannedAt`

Each future family plan must require these outputs:

- `governanceRevision`
- `revisionToken`
- `revisionBasis`
- `auditRevisionRef`
- `projectionRevisionRef`
- `changedMemoryIdsRevisionRef`
- `candidateCacheRevisionRef`
- `readSuppressionRevisionRef`
- `rollbackOrCleanupRevisionRef`
- `blockingFindings`

The required flags keep revision emission exact and bounded:

- `governanceRevisionRequired`
- `deterministicRevisionRequired`
- `auditProjectionChangedIdsParityRequired`
- `candidateCacheRevisionRequired`
- `readSuppressionRevisionRequired`
- `rollbackOrCleanupRevisionRequired`
- `staleRevisionRejected`
- `noProviderRequired`
- `noBroadScanRequired`
- `publicMcpFrozen`

## Safety Boundary

The helper requires:

- explicit input only;
- internal review only;
- public MCP tools frozen to `record_memory`, `search_memory`, and `memory_overview`;
- no runtime mutation;
- no revision emitter implementation;
- no broad real-memory scan;
- no durable audit write;
- no durable memory write;
- no candidate-cache clear;
- no provider call;
- no service start;
- no config, package, remote, or readiness side effect;
- no raw secret, workspace id, or private memory exposure.

## Explicit Non-Claims

CM-0981 does not implement or authorize:

- runtime governance-revision emission;
- provider-backed revision generation;
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

- `node --check src\core\DeferredGovernanceRevisionPolicy.js`
- `node --check tests\deferred-governance-revision-policy.test.js`
- `node --test tests\deferred-governance-revision-policy.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_REVISION_POLICY_COMPLETED_NOT_READY`

The deferred governance lane now has a machine-checkable governance revision policy for `memory_exclude` and `memory_forget`, but runtime revision emission, durable apply, cache clear, live proof, and readiness remain blocked future work.
