# CM-1265 Lifecycle Scope Client Identity Hardening

Date: 2026-06-01

## Purpose

Prevent caller-supplied search scope from becoming the trusted client identity for lifecycle scope governance read filtering.

## Change

- Updated `inferRequestClientId(...)` so request identity is inferred only from `requestContext.executionContext`.
- Updated `buildLifecycleScopeGovernanceCurrentScope(...)` so `clientId` comes from execution context / inferred request identity, not from `scope.client_id`.
- Added an integration regression test proving a Codex request cannot pass `scope.client_id='claude'` to pass lifecycle scope governance filtering for Claude-scoped private records.
- Preserved normal search scope semantics: supplied `scope.client_id` can still restrict candidates, but it does not authenticate the caller.

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
node --check tests\memory-lifecycle-scope-runtime-integration.test.js
node --test tests\memory-lifecycle-scope-runtime-integration.test.js tests\policy-read-preflight.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Status

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This improves Codex/Claude client isolation under lifecycle scope governance read policy; project state remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
