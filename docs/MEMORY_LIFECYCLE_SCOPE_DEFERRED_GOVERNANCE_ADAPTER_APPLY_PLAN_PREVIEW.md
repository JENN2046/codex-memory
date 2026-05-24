# MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_ADAPTER_APPLY_PLAN_PREVIEW

Status: `COMPLETED_VALIDATED_NOT_READY`

Task: `CM-0930`

## Scope

CM-0930 wires the CM-0929 bounded apply-plan preview helper into the internal deferred governance adapter.

This is still internal-only and default-disabled. It does not add app-level methods, does not change public `callTool()`, and does not expand public MCP tools.

## Current-State Supersession Note

This document is retained as historical evidence for the adapter-only CM-0930 slice.

It must not be read as current evidence that app-level preview methods are absent. Later committed evidence supersedes that part:

- `src/app.js` now exposes default-disabled `previewInternalMemoryExcludeApplyPlan(...)` and `previewInternalMemoryForgetApplyPlan(...)`.
- app-level tests prove those preview entries remain side-effect-free and do not perform durable apply.
- public MCP remains frozen at `record_memory`, `search_memory`, and `memory_overview`.

The still-current boundary is that apply-plan preview remains internal-only, default-disabled, non-durable, non-public, and not a readiness or reliability claim.

## Delivered Surface

Updated:

- `src/core/DeferredGovernanceRuntimeEntryAdapter.js`
- `tests/deferred-governance-runtime-entry-adapter.test.js`

The adapter now exposes two internal preview methods:

- `previewInternalMemoryExcludeApplyPlan`
- `previewInternalMemoryForgetApplyPlan`

Both methods:

- reuse the shared `InternalRuntimeEntryGate`;
- remain default-disabled through separate constructor flags;
- require the approved family-specific execution context;
- normalize through the existing deferred governance adapter payload path;
- call the CM-0929 preview helper;
- keep runtime apply and durable mutation blocked.

## Default-Off Flags

New constructor flags:

- `memoryExcludeApplyPlanPreviewEnabled`
- `memoryForgetApplyPlanPreviewEnabled`

Both default to `false`.

## Preserved Boundaries

CM-0930 still forces:

- `executionApproved=false`
- `runtimeApplyBlocked=true`
- `runtimeEntryMounted=false`
- `applyPlanPreviewCandidate=true`
- `mutated=false`
- `durableAuditWritten=false`
- `durableProjectionApplied=false`
- `candidateCacheCleared=false`
- `publicMcpExpanded=false`
- `readinessClaimed=false`

It does not:

- execute durable governance mutation;
- append durable audit records;
- update SQLite shadow projection;
- clear candidate cache;
- start HTTP MCP;
- run live recall/write proof;
- call providers;
- read real memory or `.jsonl`;
- change config/watchdog/startup;
- expand public MCP.

## Validation

Validated with:

```powershell
node --check .\src\core\DeferredGovernanceRuntimeEntryAdapter.js
node --check .\tests\deferred-governance-runtime-entry-adapter.test.js
node --test .\tests\deferred-governance-runtime-entry-adapter.test.js
node --test .\tests\deferred-governance-bounded-apply-plan-preview.test.js
node --test .\tests\deferred-governance-app-runtime-entry.test.js
git diff --check
```

Targeted coverage proves:

- preview methods are default-disabled;
- approved `memory_exclude` preview routes to CM-0929 without durable apply;
- approved `memory_forget` preview preserves forget suppression states;
- runtime apply and public MCP surface drift fail closed;
- existing dry-run adapter behavior remains intact.

## Not Claimed

This is not runtime apply readiness.

This does not prove live `memory_exclude`, live `memory_forget`, durable governance mutation, candidate-cache clearing, HTTP MCP behavior, donor compatibility changes, `memory recall reliable`, `memory write reliable`, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains controlling until later runtime proof closes with clean-baseline evidence.
