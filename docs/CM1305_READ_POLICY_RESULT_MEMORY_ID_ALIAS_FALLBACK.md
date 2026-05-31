# CM-1305 Read Policy Result Memory ID Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for `search_memory` post-filter read policy result id normalization.

Touched behavior:

- scope filter memory id lookup
- lifecycle read policy memory id lookup and stale counters
- lifecycle-scope governance read policy candidate binding
- soft read policy memory id lookup

This change does not execute true-live recall, read real memory stores, read `.jsonl`, call provider APIs, call MCP tools, write durable memory/audit outside temp-local test stores, change config/watchdog/startup, expand public MCP tools, perform remote actions, or claim readiness/reliability.

## Problem

Several post-filter policy paths selected result ids with:

```js
item.memoryId || item.memory_id
```

Whitespace-only `memoryId` values are truthy in JavaScript. They could stop fallback and hide a valid snake_case `memory_id`, causing policy metadata map lookups to miss the actual record.

That could make scope, lifecycle, lifecycle-governance, or soft-read filtering reason about an empty id instead of the real runtime result id.

## Change

Added a shared result id normalizer for the app-level post-filter policy chain. It now uses the first non-empty normalized `memoryId/memory_id` value before querying policy maps or counting stale results.

## Validation

Passed:

```powershell
node --check src\app.js
node --check tests\memory-lifecycle-scope-runtime-integration.test.js
node --test tests\memory-lifecycle-scope-runtime-integration.test.js tests\lifecycle-read-policy-runtime.test.js tests\policy-read-preflight.test.js tests\phase-a-services.test.js
```

Targeted lifecycle/policy result: `33/33` passing.

Closeout validation:

```powershell
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Default suite result: `2829/2829` passing.

## Readiness

No readiness or reliability claim is made.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
