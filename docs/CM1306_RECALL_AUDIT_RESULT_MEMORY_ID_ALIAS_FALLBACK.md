# CM-1306 Recall Audit Result Memory ID Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for recall audit result id normalization.

Touched behavior:

- normal recall audit `topMemoryId`
- normal recall audit `memoryIds`
- read-policy recall audit `topMemoryId`
- read-policy recall audit `memoryIds`

This change does not execute true-live recall, read real memory stores, read `.jsonl`, call provider APIs, call MCP tools, write durable audit outside test fixtures, change config/watchdog/startup, expand public MCP tools, perform remote actions, or claim readiness/reliability.

## Problem

Recall audit entries selected result ids from `memoryId` only. If a runtime result carried a blank camel-case `memoryId` and a valid snake_case `memory_id`, audit output could lose the top memory id and memory id set.

That weakens the audit trail for Codex/Claude recall decisions even when upstream result metadata is otherwise available.

## Change

Added a local result id normalizer in `RecallAuditService`. Normal and read-policy recall audit entries now use the first non-empty normalized `memoryId/memory_id` value.

## Validation

Passed:

```powershell
node --check src\recall\RecallAuditService.js
node --check tests\recall-audit-service.test.js
node --test tests\recall-audit-service.test.js tests\http-observe-cli.test.js tests\governance-report-cli.test.js tests\memory-overview-no-token-selected-projection.test.js
```

Targeted recall audit/observe/governance result: `47/47` passing.

Closeout validation:

```powershell
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Default suite result: `2831/2831` passing.

## Readiness

No readiness or reliability claim is made.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
