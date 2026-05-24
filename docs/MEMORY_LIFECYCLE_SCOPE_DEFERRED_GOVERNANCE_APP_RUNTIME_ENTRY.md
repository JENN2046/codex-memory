# MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_APP_RUNTIME_ENTRY

Status: `COMPLETED_VALIDATED_NOT_READY`

Task: `CM-0927`

## Scope

`createCodexMemoryApplication()` now exposes default-disabled internal app-level entry methods for deferred governance families:

- `app.executeInternalMemoryExclude(args, requestContext)`
- `app.executeInternalMemoryForget(args, requestContext)`

The methods route only to `DeferredGovernanceRuntimeEntryAdapter`, which still routes approved calls only into CM-0924 dry-run planning.

This does not change `TOOL_DEFINITIONS`, public `callTool()` routing, HTTP MCP, stdio MCP, CLI entrypoints, config files, watchdog/startup behavior, or provider behavior.

## App Integration Boundary

New app-level override flags:

- `internalMemoryExcludeRuntimeEntryEnabled`
- `internalMemoryForgetRuntimeEntryEnabled`

Both default to `false`.

When disabled, app-level calls reject without durable mutation. When enabled, calls still require the family-specific approved execution context:

- `requestSource=internal-memory-exclude-runtime-entry` and `internalMemoryExcludeRuntimeEntry=true`
- `requestSource=internal-memory-forget-runtime-entry` and `internalMemoryForgetRuntimeEntry=true`

Approved calls remain dry-run planning only.

## Runtime Boundary

CM-0927 preserves:

- `mutated=false`
- `runtimeApplyBlocked=true`
- `publicMcpExpanded=false`
- `readinessClaimed=false`
- no durable memory write
- no durable audit write
- no candidate-cache clear
- no provider/API call

Runtime apply attempts with `dry_run=false` plus `confirm=true` remain rejected by the planning service.

## Current Evidence

Validation:

```powershell
node --check .\src\app.js
node --check .\tests\deferred-governance-app-runtime-entry.test.js
node --test .\tests\deferred-governance-app-runtime-entry.test.js
node --test .\tests\deferred-governance-runtime-entry-adapter.test.js
node --test .\tests\deferred-governance-mutation-planning-service.test.js
node --test .\tests\phase-a-services.test.js
node --test .\tests\validate-memory-runtime-entry.test.js
node --test .\tests\tombstone-memory-runtime-entry.test.js
node --test .\tests\supersede-memory-runtime-entry.test.js
```

The targeted app-level test covers:

- app exposes the internal deferred-governance adapter service
- `executeInternalMemoryExclude` and `executeInternalMemoryForget` exist
- public MCP tools remain exactly `record_memory`, `search_memory`, and `memory_overview`
- `app.callTool('memory_exclude', ...)` and `app.callTool('memory_forget', ...)` remain unknown
- default-disabled reject path
- missing approved execution context reject path
- enabled approved dry-run planning for both families
- runtime apply / confirm rejection

## Not Claimed

This is not runtime readiness.

This does not prove live `memory_exclude`, live `memory_forget`, durable governance mutation, candidate-cache clearing, HTTP MCP behavior, donor compatibility changes, `memory recall reliable`, `memory write reliable`, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains controlling until later runtime proof closes with clean-baseline evidence.
