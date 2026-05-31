# CM-1269 Request Context Only Write Authority

Date: 2026-06-01

## Purpose

Ensure public `record_memory` payloads cannot authenticate themselves by carrying a synthetic execution context.

## Change

- Updated `ExecutionContextResolver.resolve(...)` to use only `requestContext.executionContext`.
- Removed the fallback to `payload.__executionContext`.
- Added an app-boundary regression proving a payload-supplied Codex execution context is rejected when the trusted request context does not provide Codex authority.

## Boundary

- Local source/test/docs/status hardening only.
- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory/audit write outside test fixtures.
- No config, watchdog, or startup change.
- No push, PR, tag, release, deploy, cutover, readiness, write reliability, or recall reliability claim.

## Validation

Validated with:

```powershell
node --check src\core\ExecutionContextResolver.js
node --check tests\phase-a-services.test.js
node --test tests\phase-a-services.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

`node --test tests\phase-a-services.test.js` passed `9/9`.
`npm test` passed `2791/2791`.

## Status

`COMPLETED_VALIDATED_NOT_READY`. This closes a local write-authority spoofing edge without changing the project posture: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
