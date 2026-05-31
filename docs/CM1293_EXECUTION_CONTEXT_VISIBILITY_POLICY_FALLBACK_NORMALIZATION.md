# CM-1293 Execution Context Visibility Policy Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1293 is a local source/test hardening slice for request execution-context scope normalization.

Changed runtime scope:

- `src/core/ExecutionContextResolver.js`
- `tests/phase-a-services.test.js`

`ExecutionContextResolver` now normalizes visibility from the first non-empty value across:

```text
visibility
visibility_policy
```

This prevents real request-context `visibility_policy` values from being dropped before they reach `record_memory` write-scope persistence.

## Validation

Passed:

```powershell
node --check src\core\ExecutionContextResolver.js
node --check tests\phase-a-services.test.js
node --test tests\phase-a-services.test.js tests\memory-write-preflight-runtime-integration.test.js tests\policy-read-preflight.test.js
npm test
```

Observed results:

```text
targeted entry/write/policy tests: 29/29 passed
npm test: 2817/2817 passed
```

## Boundaries

Not performed:

- public MCP schema expansion
- provider call
- external MCP call
- real-memory scan
- durable memory or audit write outside test fixtures
- config/watchdog/startup change
- remote action
- readiness or reliability claim

Repository posture remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
