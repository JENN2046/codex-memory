# CM-1320 Shadow Projection Status Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1320 hardens durable governance shadow projection preview status normalization.

`DurableGovernanceShadowProjectionPreview` now resolves projection record status from the first non-empty normalized value among:

- `status`
- `lifecycleStatus`
- `lifecycle_status`

This prevents no-apply tombstone/supersede projection preview from rejecting object-model or SQLite-style records that expose a blank camel-case `status` with a populated lifecycle status alias.

## Validation

- `node --check src\core\DurableGovernanceShadowProjectionPreview.js`
- `node --check tests\durable-governance-shadow-projection-preview.test.js`
- `node --test tests\durable-governance-shadow-projection-preview.test.js tests\memory-supersede-pair-outcome-helper.test.js tests\memory-supersede-runtime-prep-helper.test.js tests\durable-governance-tombstone-runtime-prep-helper.test.js` passed `29/29`
- `npm test` passed `2846/2846`

Diff, docs, ledger, and changed-scope validation are part of commit closeout.

## Safety

No live recall/write execution, real memory/store/jsonl read, provider call, external MCP call, durable memory/audit write, public MCP expansion, config/watchdog/startup change, remote action, readiness claim, or reliability claim occurred.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains unchanged.
