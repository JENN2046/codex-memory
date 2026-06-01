# CM-1322 Mutation Audit Snapshot Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1322 hardens lifecycle mutation audit snapshot construction.

The validate/tombstone/supersede mutation paths now normalize record aliases before building audit `previous_snapshot_ref` fields:

- `memoryId` / `memory_id`
- `updatedAt` / `updated_at`

Affected services:

- `ValidateMemoryService`
- `TombstoneMemoryService`
- `SupersedeMemoryService`

This prevents dry-run/apply audit previews from losing snapshot memory ids or update timestamps when a store adapter or object-model result exposes snake_case fields with blank camel-case fields.

## Validation

- `node --check src\core\ValidateMemoryService.js`
- `node --check src\core\TombstoneMemoryService.js`
- `node --check src\core\SupersedeMemoryService.js`
- `node --check tests\validate-memory-runtime.test.js`
- `node --check tests\tombstone-memory-runtime.test.js`
- `node --check tests\supersede-memory-runtime.test.js`
- `node --test tests\validate-memory-runtime.test.js tests\tombstone-memory-runtime.test.js tests\supersede-memory-runtime.test.js tests\memory-lifecycle-scope-runtime-integration.test.js` passed `59/59`
- `npm test` passed `2852/2852`

Diff, docs, ledger, and changed-scope validation are part of commit closeout.

## Safety

No live recall/write execution, real memory/store/jsonl read, provider call, external MCP call, durable memory/audit write outside temp-local test stores, public MCP expansion, config/watchdog/startup change, remote action, readiness claim, or reliability claim occurred.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains unchanged.
