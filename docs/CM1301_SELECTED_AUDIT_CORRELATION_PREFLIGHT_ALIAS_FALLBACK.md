# CM-1301 Selected Audit Correlation Preflight Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for selected audit-correlation observation preflight normalization.

Touched behavior:

- `normalizePreflightInput(...)`
- prior-result task/result binding
- current-artifact task/result binding
- packet id and request hash alias binding

This change does not execute selected audit observation, read true audit logs, call provider APIs, call MCP tools, scan real memory, write durable memory/audit, change config/watchdog/startup, perform remote actions, or claim readiness/reliability.

## Problem

The preflight accepted both camel-case and snake-case metadata names, but several fields used `valueA || valueB` before trimming. A blank-but-present camel-case value such as `taskId: "   "` could be selected before `task_id`, then normalize to an empty string.

That made object-model or JSON-style inputs vulnerable to false missing-prerequisite or missing-artifact blockers even when the snake_case alias carried the correct value.

## Change

Added first non-empty normalized fallback handling for:

- `packetId` / `packet_id`
- `requestSha256` / `request_sha256`
- prior result `taskId` / `task_id`
- prior result `resultClass` / `result_class`
- current artifact `taskId` / `task_id`
- current artifact `resultClass` / `result_class`

The preflight remains explicit-input-only and still does not read files, run commands, or execute the selected audit observation.

## Validation

Passed:

```powershell
node --check src\core\SelectedAuditCorrelationObservationPreflight.js
node --check tests\selected-audit-correlation-observation-preflight.test.js
node --test tests\selected-audit-correlation-observation-preflight.test.js tests\selected-audit-correlation-current-facts-preflight-cli.test.js tests\selected-audit-correlation-current-facts-stage-gate-cli.test.js tests\selected-audit-correlation-result-classifier.test.js
```

Targeted selected-audit-correlation result: `28/28` passing.

Closeout validation:

```powershell
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Default suite result: `2823/2823` passing.

## Readiness

No readiness or reliability claim is made.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
