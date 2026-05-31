# CM-1282 Recall Isolation Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for recall isolation classification.

This change does not call providers, call MCP external tools, scan real memory, write durable memory or audit outside test fixtures, change config/watchdog/startup, expand public MCP tools, push, deploy, or claim readiness/reliability.

## Change

`src/core/RecallIsolationClassifier.js` now uses the first non-empty normalized value when comparing paired scope fields:

- `projectId` -> `project_id`
- `workspaceId` -> `workspace_id`
- `clientId` -> `client_id`

Terminal lifecycle status classification also falls through from blank `status` / `lifecycleStatus` to `lifecycle_status`.

This prevents blank camel-case fields from masking valid SQLite-style or fixture-style snake_case values during recall isolation.

## Validation

- `node --check src\core\RecallIsolationClassifier.js`
- `node --check tests\recall-isolation-classification-runtime.test.js`
- `node --test tests\recall-isolation-classification-runtime.test.js tests\lifecycle-read-policy-runtime.test.js tests\policy-read-preflight.test.js` passed `42/42`.
- `npm test` passed `2802/2802`.

## Remaining Boundary

This is local source/test evidence only. It is not fresh live client evidence, recall reliability, runtime readiness, cutover readiness, or RC readiness.
