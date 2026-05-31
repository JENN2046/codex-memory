# CM-1264 Soft Read Policy Client Identity Hardening

Date: 2026-06-01

## Purpose

Prevent caller-supplied search scope from becoming the trusted client identity for private memory filtering.

## Change

- Updated `applySoftReadPolicy(...)` so request identity is inferred only from `requestContext.executionContext`, not from `scope.client_id`.
- Added a runtime regression test proving a Codex request cannot pass `scope.client_id='claude'` to read Claude private records.
- Preserved normal scope filtering semantics: supplied `scope` still filters candidates, but it does not authenticate the caller.

## Boundary

- Local source/test/docs/status hardening only.
- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory/audit write.
- No config, watchdog, or startup change.
- No push, PR, tag, release, deploy, cutover, readiness, write reliability, or recall reliability claim.

## Validation

Planned validation:

```powershell
node --check src\app.js
node --check tests\policy-read-preflight.test.js
node --test tests\policy-read-preflight.test.js tests\scope-filter.test.js tests\mcp-contract.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This improves Codex/Claude client isolation under soft read policy; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
