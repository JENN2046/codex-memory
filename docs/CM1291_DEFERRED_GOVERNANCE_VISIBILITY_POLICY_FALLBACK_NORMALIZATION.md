# CM-1291 Deferred Governance Visibility Policy Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1291 is a local source/test hardening slice for deferred-governance runtime-entry scope normalization.

Changed runtime scope:

- `src/core/DeferredGovernanceRuntimeEntryAdapter.js`
- `tests/deferred-governance-runtime-entry-adapter.test.js`

The adapter now normalizes `scopeTuple.visibility` from the first non-empty value across:

```text
visibility
visibility_policy
```

This prevents blank camel-case `visibility` from masking snake_case `visibility_policy` when constructing internal `memory_exclude` / `memory_forget` runtime entries.

## Validation

Passed:

```powershell
node --check src\core\DeferredGovernanceRuntimeEntryAdapter.js
node --check tests\deferred-governance-runtime-entry-adapter.test.js
node --test tests\deferred-governance-runtime-entry-adapter.test.js tests\deferred-governance-mutation-planning-service.test.js tests\deferred-governance-bounded-apply-plan-preview.test.js tests\deferred-governance-app-runtime-entry.test.js
npm test
```

Observed results:

```text
targeted deferred-governance tests: 32/32 passed
npm test: 2817/2817 passed
```

## Boundaries

Not performed:

- runtime apply
- durable projection or audit write
- provider call
- external MCP call
- real-memory scan
- public MCP tool expansion
- config/watchdog/startup change
- remote action
- readiness or reliability claim

Repository posture remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
