# CM-1294 Recall Audit Scope Field Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1294 is a local source/test hardening slice for recall audit scope metadata.

Changed runtime scope:

- `src/recall/RecallAuditService.js`
- `tests/recall-audit-service.test.js`

`RecallAuditService` now normalizes scope audit metadata across these aliases:

```text
scopeApplied / scope_applied
scopeMode / scope_mode
scopeDimensions / scope_dimensions
scopeStrict / scope_strict
scopeProjectId / scope_project_id
scopeClientId / scope_client_id
scopeVisibility / scope_visibility / visibility
scopeWorkspacePresent / scope_workspace_present
```

The emitted audit shape remains camel-case for existing observe/dashboard consumers, and raw workspace ids are still not serialized.

## Validation

Passed:

```powershell
node --check src\recall\RecallAuditService.js
node --check tests\recall-audit-service.test.js
node --test tests\recall-audit-service.test.js tests\scope-filter.test.js tests\lifecycle-read-policy-runtime.test.js tests\http-observe-cli.test.js
npm test
```

Observed results:

```text
targeted recall/scope/observe tests: 47/47 passed
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
