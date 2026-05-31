# CM-1297 Recall Isolation Visibility Policy Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1297 is a local source/test hardening slice for recall isolation scope checks.

Changed runtime scope:

- `src/core/RecallIsolationClassifier.js`
- `tests/recall-isolation-classification-runtime.test.js`

`RecallIsolationClassifier.matchesOutOfScope(...)` now compares expected visibility against the first non-empty normalized value from:

```text
visibility / visibility_policy
```

This aligns visibility handling with the existing project/workspace/client snake_case fallback pattern and avoids misclassifying SQLite/object-model style records that carry `visibility_policy` but have blank `visibility`.

## Validation

Passed:

```powershell
node --check src\core\RecallIsolationClassifier.js
node --check tests\recall-isolation-classification-runtime.test.js
node --test tests\recall-isolation-classification-runtime.test.js tests\policy-read-preflight.test.js tests\lifecycle-read-policy-runtime.test.js tests\memory-lifecycle-scope-governance-contract.test.js
npm test
```

Observed results:

```text
targeted recall isolation / policy / lifecycle tests: 54/54 passed
npm test: 2819/2819 passed
```

## Boundaries

Not performed:

- live recall
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
