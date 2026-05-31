# CM-1272 Gate CI Policy Preflight Ownerless Private

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1272 aligns the fixture-only `gate:ci` policy preflight with the CM-1271 runtime soft-read boundary.

Changed files:

- `src/cli/gate-ci.js`
- `tests/gate-ci-cli.test.js`

## Result

`applyFixtureSoftReadPolicy(...)` now filters private fixture records when `clientId` is missing or does not match the request client. The policy preflight fixture now includes ownerless private and ownerless shared records so the gate distinguishes:

- ownerless private: filtered
- cross-client private: filtered
- ownerless shared: kept

The `policyPreflight.detail` output now exposes:

- `privateVisibilityFilteredCount`
- `crossClientPrivateFilteredCount`
- `ownerlessPrivateFilteredCount`

Current fixture-only `gate:ci` policy preflight result:

```text
4/9 records would remain under soft read policy
privateVisibilityFilteredCount=2
crossClientPrivateFilteredCount=1
ownerlessPrivateFilteredCount=1
```

## Validation

Passed:

```powershell
node --check src\cli\gate-ci.js
node --check tests\gate-ci-cli.test.js
node --test tests\gate-ci-cli.test.js tests\policy-read-preflight.test.js
npm run gate:ci -- --json
npm test
```

Validation results:

- targeted tests: `11/11`
- `gate:ci`: PASS, fixture-only, no provider, no daemon, no network, `2793/2793` CI-safe tests
- default suite: `2793/2793`

## Boundaries

No provider call, MCP external call, real-memory scan, durable memory/audit write outside test fixtures, config/watchdog/startup change, public MCP tool expansion, remote action, readiness claim, or reliability claim occurred.

The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
