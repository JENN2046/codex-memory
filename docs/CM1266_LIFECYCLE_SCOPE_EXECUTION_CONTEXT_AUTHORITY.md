# CM-1266 Lifecycle Scope Execution Context Authority

Date: 2026-06-01

## Purpose

Ensure lifecycle scope governance read filtering treats caller-supplied search scope only as candidate selection, not as authoritative current execution scope.

## Change

- Updated `buildLifecycleScopeGovernanceCurrentScope(...)` so all current-scope fields come from `requestContext.executionContext`.
- Preserved search `scope` as SQL candidate filtering and post-filtering input.
- Added an integration regression proving a Codex request scoped to another project/workspace cannot pass lifecycle scope governance filtering when execution context remains in the original project/workspace.

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

`COMPLETED_VALIDATED_NOT_READY` after the listed validation passes. This strengthens Codex/Claude scoped recall isolation and keeps project state `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
