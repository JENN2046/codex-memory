# CM-1302 Lifecycle Governance Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for lifecycle governance and write lifecycle preflight normalization.

Touched behavior:

- governance transition approval timestamp alias binding
- accepted recall candidate rank hint alias binding
- write candidate lifecycle status/action alias binding

This change does not execute write, tombstone, supersede, rollback, apply, true audit-log read, true memory read, provider API calls, MCP tool calls, durable memory/audit writes, config/watchdog/startup changes, remote actions, or readiness/reliability claims.

## Problem

Most lifecycle scope fields already used first non-empty normalized alias handling, but a few remaining lifecycle governance fields still used `valueA || value_b` before trimming.

That allowed blank camel-case fields such as `approvedAt: "   "`, `rankHint: "   "`, `lifecycleStatus: "   "`, or `lifecycleAction: "   "` to mask valid snake_case aliases. In the lifecycle-action case, the preflight could silently fall back to `create` instead of respecting `lifecycle_action=supersede`.

## Change

Added first non-empty normalized fallback handling for:

- `approvedAt` / `approved_at`
- `rankHint` / `rank_hint`
- `lifecycleStatus` / `lifecycle_status`
- `lifecycleAction` / `lifecycle_action`

This keeps object-model and SQLite-style inputs aligned with the rest of the lifecycle scope normalization chain.

## Validation

Passed:

```powershell
node --check src\core\MemoryLifecycleScopeGovernanceContract.js
node --check src\core\MemoryWriteLifecycleDedupSuppressionPreflight.js
node --check tests\memory-lifecycle-scope-governance-contract.test.js
node --check tests\memory-write-lifecycle-dedup-suppression-preflight.test.js
node --test tests\memory-lifecycle-scope-governance-contract.test.js tests\memory-write-lifecycle-dedup-suppression-preflight.test.js tests\lifecycle-read-policy-runtime.test.js tests\memory-lifecycle-scope-runtime-integration.test.js
```

Targeted lifecycle/write result: `33/33` passing.

Closeout validation:

```powershell
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Default suite result: `2824/2824` passing.

## Readiness

No readiness or reliability claim is made.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
