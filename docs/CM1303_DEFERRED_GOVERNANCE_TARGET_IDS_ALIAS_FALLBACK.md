# CM-1303 Deferred Governance Target IDs Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for deferred governance runtime-entry target id normalization.

Touched behavior:

- `normalizeEntryPayload(...)`
- internal `memory_exclude` target id binding
- internal `memory_forget` target id binding

This change does not execute runtime apply, write durable projection/audit, read true audit logs, read true memory, call provider APIs, call MCP tools, change config/watchdog/startup, expand public MCP tools, perform remote actions, or claim readiness/reliability.

## Problem

The runtime-entry adapter accepted several target id aliases:

- `targetMemoryIds`
- `target_memory_ids`
- `memory_ids`
- `memoryIds`
- `memory_id`
- `memoryId`

It selected among those aliases with `||`. An empty array is truthy in JavaScript, so `targetMemoryIds: []` could stop fallback and hide a later non-empty alias such as `memory_ids`.

That could make an otherwise valid internal `memory_exclude` or `memory_forget` candidate appear to have no target ids.

## Change

Added first non-empty normalized array fallback for target ids. The adapter now walks all target id aliases and uses the first one that normalizes to at least one non-empty id.

Duplicate ids are still deduplicated by the existing normalization behavior.

## Validation

Passed:

```powershell
node --check src\core\DeferredGovernanceRuntimeEntryAdapter.js
node --check tests\deferred-governance-runtime-entry-adapter.test.js
node --test tests\deferred-governance-runtime-entry-adapter.test.js tests\deferred-governance-mutation-planning-service.test.js tests\durable-governance-mutation-dry-run-helper.test.js
```

Targeted deferred-governance result: `28/28` passing.

Closeout validation:

```powershell
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Default suite result: `2825/2825` passing.

## Readiness

No readiness or reliability claim is made.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
