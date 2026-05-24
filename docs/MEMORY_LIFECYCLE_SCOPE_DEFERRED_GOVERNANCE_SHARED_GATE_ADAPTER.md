# MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_SHARED_GATE_ADAPTER

Status: `COMPLETED_VALIDATED_NOT_READY`

Task: `CM-0926`

## Scope

`DeferredGovernanceRuntimeEntryAdapter` now reuses the shared `InternalRuntimeEntryGate` for the deferred `memory_exclude` and `memory_forget` internal adapter candidates.

This remains an unmounted source-level adapter slice. It is not wired into `src/app.js`, CLI entrypoints, HTTP MCP, stdio MCP, `TOOL_DEFINITIONS`, or public `callTool()` routing.

## Current-State Supersession Note

This document is retained as historical evidence for the CM-0926 adapter-only slice.

It must not be read as current evidence that deferred governance has no app-level entry surfaces. Later committed evidence supersedes that part:

- `src/app.js` now exposes default-disabled internal app methods for `executeInternalMemoryExclude(...)`, `executeInternalMemoryForget(...)`, `previewInternalMemoryExcludeApplyPlan(...)`, and `previewInternalMemoryForgetApplyPlan(...)`.
- `tests/deferred-governance-app-runtime-entry.test.js` covers the app-level dry-run and apply-plan preview boundaries.
- `docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_FAMILY_STABILIZATION_REVIEW.md` records that deferred `memory_exclude` / `memory_forget` have default-disabled app/adapter dry-run candidate surfaces but are not durable mutation runtime adopters.

The still-current boundary is unchanged: no public MCP expansion, no public `callTool()` widening, no durable governance mutation, no candidate-cache clearing, and no readiness/reliability claim.

## Shared Gate Adoption

The adapter now delegates the common internal-entry checks to `buildInternalRuntimeEntryPayload(...)`:

- default-disabled rejection
- approved internal execution-context enforcement
- `requestSource` matching
- `actor_client_id` fallback from execution context
- scalar field alias handling for `approval_id`, `reason`, `evidence_summary`, and `audit_correlation_id`
- `dry_run` / `confirm` pass-through

The adapter still owns governance-specific normalization for:

- target memory id arrays
- scope tuple redaction
- family-specific `contextFlag`
- routing into CM-0924 dry-run planning

This keeps the shared gate small and avoids expanding it into a governance-specific parser.

## Runtime Boundary

The adapter still preserves the CM-0924 / CM-0925 dry-run-only boundary:

- `mutated=false`
- `runtimeEntryMounted=false`
- `runtimeApplyBlocked=true`
- `runtimeIntegrated=false`
- `publicMcpExpanded=false`
- `readinessClaimed=false`
- `durableAuditWritten=false`
- `durableProjectionApplied=false`

Runtime apply attempts with `dry_run=false` or `dryRun=false` plus `confirm=true` remain rejected by the planning service.

## Current Evidence

Validation:

```powershell
node --check .\src\core\DeferredGovernanceRuntimeEntryAdapter.js
node --check .\tests\deferred-governance-runtime-entry-adapter.test.js
node --test .\tests\deferred-governance-runtime-entry-adapter.test.js
node --test .\tests\internal-runtime-entry-gate.test.js
node --test .\tests\deferred-governance-mutation-planning-service.test.js
```

The targeted adapter test now covers:

- default-disabled rejection without service invocation
- missing approved context rejection without service invocation
- approved `memory_exclude` routing to dry-run planning only
- approved `memory_forget` routing to dry-run planning only
- shared gate scalar-field normalization and execution-context actor fallback
- runtime apply / confirm rejection
- alias normalization and scope-id redaction
- public MCP freeze
- no implicit filesystem read during adapter execution

Changed-scope entrypoint scan found no `executeInternalMemoryExclude`, `executeInternalMemoryForget`, `memory_exclude`, or `memory_forget` references in:

- `src/app.js`
- `src/core/constants.js`
- `src/index.js`
- `src/http-index.js`

## Not Claimed

This is not runtime readiness.

This does not prove live `memory_exclude`, live `memory_forget`, app-level entries, durable governance mutation, candidate-cache clearing, HTTP MCP behavior, donor compatibility changes, `memory recall reliable`, `memory write reliable`, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains controlling until later runtime proof closes with clean-baseline evidence.
