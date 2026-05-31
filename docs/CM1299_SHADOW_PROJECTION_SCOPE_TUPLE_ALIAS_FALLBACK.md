# CM-1299 Shadow Projection Scope Tuple Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for durable governance shadow projection previews.

The no-apply projection preview now normalizes:

- projection record `visibility/visibility_policy`
- dry-run `scopeTuple` project/workspace/client/task/conversation/visibility/retention camel-case and snake_case aliases

This prevents SQLite/object-model style projection inputs from being rejected as scope mismatches only because blank camel-case fields masked valid snake_case values.

## Validation

- `node --check src\core\DurableGovernanceShadowProjectionPreview.js`
- `node --check tests\durable-governance-shadow-projection-preview.test.js`
- `node --test tests\durable-governance-shadow-projection-preview.test.js tests\durable-governance-mutation-dry-run-helper.test.js tests\durable-governance-tombstone-runtime-prep-helper.test.js tests\memory-supersede-runtime-prep-helper.test.js` passed `29/29`
- `npm test` passed `2821/2821`

## Boundaries

No apply, rollback, cleanup, provider call, external MCP call, real-memory scan, durable memory/audit write outside test fixtures, config/watchdog/startup change, remote action, readiness claim, or reliability claim.
