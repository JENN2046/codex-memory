# CM-1292 Memory Write Visibility Policy Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1292 is a local source/test hardening slice for `record_memory` write-scope normalization.

Changed runtime scope:

- `src/core/MemoryWriteService.js`
- `tests/memory-write-preflight-runtime-integration.test.js`

`MemoryWriteService` now normalizes write-scope visibility from the first non-empty value across:

```text
visibility
visibility_policy
```

This applies to both write preflight allowed scope and the persisted record scope used by shadow/diary/vector/audit test projections.

## Validation

Passed:

```powershell
node --check src\core\MemoryWriteService.js
node --check tests\memory-write-preflight-runtime-integration.test.js
node --test tests\memory-write-preflight-runtime-integration.test.js tests\phase-a-services.test.js tests\proof-memory-policy.test.js tests\memory-write-lifecycle-dedup-suppression-preflight.test.js
npm test
```

Observed results:

```text
targeted write/proof tests: 34/34 passed
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
