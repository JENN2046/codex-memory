# CM-1271 Private Read Missing Owner Fail Closed

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Summary

CM-1271 hardens the soft read policy boundary for private records that lack owner client metadata.

Before this change, `applySoftReadPolicy(...)` hid private records only when `clientId` was present and different from the trusted request client. A malformed or legacy private record with missing `client_id` could therefore pass the private visibility check.

After this change, `visibility='private'` requires a non-empty owner `client_id` that matches the trusted request client. Missing private owner metadata fails closed. Shared records without owner metadata remain visible.

## Changed Scope

- `src/app.js`
- `tests/policy-read-preflight.test.js`

## Validation

- `node --check src\app.js`
- `node --check tests\policy-read-preflight.test.js`
- `node --test tests\policy-read-preflight.test.js tests\memory-lifecycle-scope-runtime-integration.test.js tests\phase-a-services.test.js` passed `22/22`.
- `npm test` passed `2793/2793`.

## Boundary

CM-1271 did not call providers, external MCP tools, real memory tools, or live client runtimes. It did not scan broad real memory, write durable memory/audit outside test fixtures, change config/watchdog/startup, expand public MCP tools, run migration/import/export/backup/restore apply, push, open or update PRs, release, deploy, cut over, or claim readiness/reliability.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
