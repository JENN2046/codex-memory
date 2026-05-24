# MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_MUTATION_PLANNING_SERVICE

Status: `COMPLETED_VALIDATED_LOCAL_COMMIT_NOT_READY`

Current commit task: `CM-0985`

Original candidate lineage: `CM-0924`

## Scope

`DeferredGovernanceMutationPlanningService` is a source-level internal candidate for deferred `memory_exclude` and `memory_forget` governance planning.

It is intentionally not wired into `src/app.js`, CLI entrypoints, HTTP MCP, stdio MCP, `TOOL_DEFINITIONS`, or public `callTool()` routing.

## Accepted Families

The service only plans:

- `memory_exclude` through `MemoryExcludeGovernanceService.planMemoryExclude`
- `memory_forget` through `MemoryForgetGovernanceService.planMemoryForget`

The public MCP tool set remains frozen:

```text
record_memory
search_memory
memory_overview
```

## Safety Boundary

The candidate is dry-run-only:

- `dryRun=true` is required by behavior
- `dryRun=false` is rejected
- `confirm=true` is rejected
- `mutated=false`
- `runtimeApplyBlocked=true`
- `durableAuditWritten=false`
- `durableProjectionApplied=false`
- `publicMcpExpanded=false`
- `readinessClaimed=false`

It does not read files, execute commands, start services, call providers, scan real memory, write durable memory, write audit logs, clear candidate cache, or apply SQLite projection updates.

## Planned Outputs

For accepted dry-run input, the service returns:

- target memory ids and changed memory ids
- redacted scope tuple
- family-specific internal surface
- suppression projection preview
- append-only audit preview with pending / committed / cancelled phases
- governance revision preview
- target-only candidate-cache invalidation plan
- read-policy suppression plan
- rollback or cleanup note
- frozen public MCP tool list

## Current Evidence

Validation:

```powershell
node --check .\src\core\DeferredGovernanceMutationPlanningService.js
node --check .\tests\deferred-governance-mutation-planning-service.test.js
node --test .\tests\deferred-governance-mutation-planning-service.test.js
```

The targeted test covers:

- accepted `memory_exclude` dry-run planning
- accepted `memory_forget` dry-run planning
- runtime apply / confirm rejection
- family request source / context flag drift rejection
- unsupported family rejection
- missing targets and empty scope rejection
- unexpected public-MCP-like payload key rejection
- secret-like content rejection and normalized output redaction
- no implicit filesystem read during planning

CM-0985 reran this narrow gate before local commit consideration because CM-0984 now depends on this module.

## Not Claimed

This is not runtime readiness.

This does not prove `memory recall reliable`, `memory write reliable`, live real-store behavior, provider behavior, HTTP MCP behavior, donor compatibility changes, or VCP full parity.

`RC_NOT_READY_BLOCKED` remains controlling until later runtime proof closes with clean-baseline evidence.
