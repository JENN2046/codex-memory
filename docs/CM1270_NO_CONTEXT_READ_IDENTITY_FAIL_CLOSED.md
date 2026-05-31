# CM-1270 No-Context Read Identity Fail Closed

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Summary

CM-1270 hardens the Codex/Claude read-isolation boundary for missing trusted request context.

Before this change, `inferRequestClientId(...)` could default a request without `requestContext.executionContext` to `codex`. That made missing trusted identity look like a Codex identity for soft read policy checks.

After this change, missing or non-object `requestContext.executionContext` resolves to `null`. Soft read policy still permits shared records, but it no longer treats absent trusted context as Codex private-read authority.

## Changed Scope

- `src/app.js`
- `tests/policy-read-preflight.test.js`

## Validation

- `node --check src\app.js`
- `node --check tests\policy-read-preflight.test.js`
- `node --test tests\policy-read-preflight.test.js tests\memory-lifecycle-scope-runtime-integration.test.js tests\phase-a-services.test.js` passed `21/21`.
- `npm test` passed `2792/2792`.

## Boundary

CM-1270 did not call providers, external MCP tools, real memory tools, or live client runtimes. It did not scan broad real memory, write durable memory/audit outside test fixtures, change config/watchdog/startup, expand public MCP tools, run migration/import/export/backup/restore apply, push, open or update PRs, release, deploy, cut over, or claim readiness/reliability.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
