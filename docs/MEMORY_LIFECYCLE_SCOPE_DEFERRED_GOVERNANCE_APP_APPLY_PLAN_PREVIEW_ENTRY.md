# CM-0931 Deferred Governance App Apply-Plan Preview Entry

Date: 2026-05-24

Status: `MEMORY_LIFECYCLE_SCOPE_DEFERRED_GOVERNANCE_APP_APPLY_PLAN_PREVIEW_ENTRY_COMPLETED_NOT_READY`

## Scope

This slice wires the CM-0930 deferred governance adapter apply-plan preview into `createCodexMemoryApplication()` as default-disabled internal app methods:

- `previewInternalMemoryExcludeApplyPlan`
- `previewInternalMemoryForgetApplyPlan`

The methods route only to `services.deferredGovernanceRuntimeEntryAdapter`.

## Boundaries

- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.
- `callTool()` still has no `memory_exclude`, `memory_forget`, or preview tool branch.
- Preview entries require explicit app construction overrides before routing to the adapter preview path.
- Preview results remain no-apply: `executionApproved=false`, `runtimeApplyBlocked=true`, `mutated=false`, `durableAuditWritten=false`, `durableProjectionApplied=false`, `candidateCacheCleared=false`, `publicMcpExpanded=false`, and `readinessClaimed=false`.

## Validation

Passed:

- `node --check src\app.js`
- `node --check tests\deferred-governance-app-runtime-entry.test.js`
- `node --test tests\deferred-governance-app-runtime-entry.test.js` (`7/7`)
- `node --test tests\deferred-governance-runtime-entry-adapter.test.js` (`12/12`)
- `node --test tests\deferred-governance-bounded-apply-plan-preview.test.js` (`6/6`)
- Public MCP freeze scan over `src\app.js`, `src\core\constants.js`, `src\index.js`, and `src\http-index.js`
- `git diff --check -- src\app.js tests\deferred-governance-app-runtime-entry.test.js`

## Not Proven

This does not prove live `memory_exclude`, live `memory_forget`, durable governance mutation, candidate-cache clearing, HTTP MCP behavior, donor compatibility changes, `memory recall reliable`, `memory write reliable`, runtime readiness, RC readiness, or VCP full parity.
