# CM-1296 Audit Summary Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1296 is a local source/test hardening slice for audit summary consumers.

Changed runtime scope:

- `src/recall/RecallAuditService.js`
- `src/core/MemoryOverviewService.js`
- `src/cli/http-observe.js`
- `src/cli/dashboard.js`
- `src/cli/governance-report.js`
- `tests/memory-overview-no-token-selected-projection.test.js`
- `tests/http-observe-cli.test.js`
- `tests/governance-report-cli.test.js`

`RecallAuditService` now exports the existing scope and policy audit normalizers. The overview, observe, dashboard, and governance-report summary paths use those normalizers before aggregating audit evidence.

Covered summary aliases include:

```text
scopeApplied / scope_applied
scopeMode / scope_mode
scopeDimensions / scope_dimensions
scopeStrict / scope_strict
scopeProjectId / scope_project_id
scopeClientId / scope_client_id
scopeVisibility / scope_visibility / visibility
scopeWorkspacePresent / scope_workspace_present
readPolicyApplied / read_policy_applied
lifecyclePolicyApplied / lifecycle_policy_applied
hiddenByLifecycleCount / hidden_by_lifecycle_count
staleResultCount / stale_result_count
lifecycleColumnAvailable / lifecycle_column_available
```

The public summary output remains camel-case and no raw workspace id is emitted.

## Validation

Passed:

```powershell
node --test tests\memory-overview-no-token-selected-projection.test.js tests\http-observe-cli.test.js tests\governance-report-cli.test.js tests\dashboard-cli.test.js tests\recall-audit-service.test.js
npm test
```

Observed results:

```text
targeted overview/observe/governance/dashboard/recall tests: 65/65 passed
npm test: 2819/2819 passed
```

## Boundaries

Not performed:

- live recall
- provider call
- external MCP call
- real-memory scan
- durable audit write outside test fixtures
- config/watchdog/startup change
- remote action
- readiness or reliability claim

Repository posture remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
