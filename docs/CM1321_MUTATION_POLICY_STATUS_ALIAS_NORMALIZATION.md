# CM-1321 Mutation Policy Status Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1321 hardens lifecycle mutation service transition guards.

The following services now resolve policy status from the first non-empty normalized value among:

- `status`
- `lifecycleStatus`
- `lifecycle_status`

Affected services:

- `ValidateMemoryService`
- `TombstoneMemoryService`
- `SupersedeMemoryService`

This prevents validate/tombstone/supersede dry-run and apply preflight paths from misclassifying valid lifecycle status as `unknown` when a store adapter or object-model policy result exposes lifecycle status aliases instead of a populated `status` field.

## Validation

- `node --check src\core\ValidateMemoryService.js`
- `node --check src\core\TombstoneMemoryService.js`
- `node --check src\core\SupersedeMemoryService.js`
- `node --check tests\validate-memory-runtime.test.js`
- `node --check tests\tombstone-memory-runtime.test.js`
- `node --check tests\supersede-memory-runtime.test.js`
- `node --test tests\validate-memory-runtime.test.js tests\tombstone-memory-runtime.test.js tests\supersede-memory-runtime.test.js tests\memory-lifecycle-scope-runtime-integration.test.js` passed `56/56`
- `npm test` passed `2849/2849`

Diff, docs, ledger, and changed-scope validation are part of commit closeout.

## Safety

No live recall/write execution, real memory/store/jsonl read, provider call, external MCP call, durable memory/audit write outside temp-local test stores, public MCP expansion, config/watchdog/startup change, remote action, readiness claim, or reliability claim occurred.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains unchanged.
