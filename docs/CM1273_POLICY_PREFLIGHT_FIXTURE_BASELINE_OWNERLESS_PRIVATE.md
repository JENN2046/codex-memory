# CM-1273 Policy Preflight Fixture Baseline Ownerless Private

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1273 aligns `tests/policy-read-preflight.test.js` with the CM-1272 fixture-only `gate:ci` policy preflight baseline.

Changed file:

- `tests/policy-read-preflight.test.js`

## Result

The CI-safe soft-read policy preflight fixture baseline now includes ownerless private and ownerless shared records. It distinguishes:

- ownerless private: filtered
- cross-client private: filtered
- ownerless shared: kept

The baseline now asserts:

```text
fixtures.length=9
kept.length=4
lifecycleFilteredCount=3
privateVisibilityFilteredCount=2
crossClientPrivateFilteredCount=1
ownerlessPrivateFilteredCount=1
```

This keeps the policy-read preflight unit baseline aligned with fixture-only `gate:ci` policy preflight evidence.

## Validation

Passed:

```powershell
node --check tests\policy-read-preflight.test.js
node --check tests\gate-ci-cli.test.js
node --test tests\policy-read-preflight.test.js tests\gate-ci-cli.test.js
npm test
```

Validation results:

- targeted tests: `11/11`
- default suite: `2793/2793`

## Boundaries

No runtime source behavior changed. No provider call, MCP external call, real-memory scan, durable memory/audit write, config/watchdog/startup change, public MCP tool expansion, remote action, readiness claim, or reliability claim occurred.

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
