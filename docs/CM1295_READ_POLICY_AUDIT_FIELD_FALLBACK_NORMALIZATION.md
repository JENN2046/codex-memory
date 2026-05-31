# CM-1295 Read-Policy Audit Field Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1295 is a local source/test hardening slice for read-policy recall audit metadata.

Changed runtime scope:

- `src/recall/RecallAuditService.js`
- `tests/recall-audit-service.test.js`

`RecallAuditService` now normalizes read-policy `policyAudit` metadata across these aliases:

```text
readPolicyApplied / read_policy_applied
lifecyclePolicyApplied / lifecycle_policy_applied
lifecycleIncludedStatuses / lifecycle_included_statuses
lifecycleExcludedStatuses / lifecycle_excluded_statuses
hiddenByLifecycleCount / hidden_by_lifecycle_count
staleResultCount / stale_result_count
lifecycleColumnAvailable / lifecycle_column_available
```

The emitted audit shape remains camel-case for existing observe and governance-report consumers.

## Validation

Passed:

```powershell
node --check src\recall\RecallAuditService.js
node --check tests\recall-audit-service.test.js
node --test tests\recall-audit-service.test.js tests\lifecycle-read-policy-runtime.test.js tests\http-observe-cli.test.js tests\governance-report-cli.test.js
npm test
```

Observed results:

```text
targeted audit/observe/governance-report tests: 50/50 passed
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
