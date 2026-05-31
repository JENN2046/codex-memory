# CM-1288 Supersede Pair Scope Fallback Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1288 hardens the local `supersede_memory` pair scope guard so store-returned records with blank camel-case scope fields can still use SQLite-style snake_case fallback fields before mutation/audit decisions.

Covered record field pairs:

- `projectId/project_id`
- `workspaceId/workspace_id`
- `clientId/client_id`
- `taskId/task_id`
- `conversationId/conversation_id`
- `visibility/visibility_policy`
- `retentionPolicy/retention_policy`

## Change

`src/core/SupersedeMemoryService.js` now uses the first non-empty normalized value for each pair scope field in `normalizeScopeTuple(...)`.

The regression in `tests/supersede-memory-runtime.test.js` monkey-patches the temp-local shadow store to return blank camel-case scope fields plus valid snake_case fields. The service accepts the matching pair scope, returns `decision=dry-run`, keeps `mutated=false`, leaves old/new rows unchanged, and writes no audit entries.

## Validation

- `node --check src\core\SupersedeMemoryService.js`
- `node --check tests\supersede-memory-runtime.test.js`
- `node --test tests\supersede-memory-runtime.test.js tests\supersede-memory-temp-local-evidence.test.js tests\memory-supersede-runtime-prep-helper.test.js tests\memory-supersede-pair-outcome-helper.test.js tests\memory-supersede-shadow-seam-contract.test.js` passed `34/34`
- `npm test` passed `2813/2813`

## Boundaries

- No public MCP tool or schema expansion.
- No provider call.
- No external MCP call.
- No broad real-memory scan.
- No durable memory/audit write outside temp-local test stores.
- No config, watchdog, or startup change.
- No remote action.
- No runtime readiness, RC readiness, write reliability, recall reliability, or rollback readiness claim.
