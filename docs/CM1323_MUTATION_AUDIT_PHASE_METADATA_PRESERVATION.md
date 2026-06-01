# CM-1323 Mutation Audit Phase Metadata Preservation

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1323 hardens validate/tombstone lifecycle mutation audit phase events.

`ValidateMemoryService` and `TombstoneMemoryService` committed/cancelled audit events now preserve the base mutation audit metadata from the pending event, including:

- `reason`
- `evidence`
- `reversible`
- `previous_snapshot_ref`
- `created_at`

This keeps validate/tombstone audit chains consistent with the supersede audit plan and prevents rollback/review consumers from seeing snapshot refs only on the pending phase while committed/cancelled phases lose the same rollback binding metadata.

## Validation

- `node --check src\core\ValidateMemoryService.js`
- `node --check src\core\TombstoneMemoryService.js`
- `node --check tests\validate-memory-runtime.test.js`
- `node --check tests\tombstone-memory-runtime.test.js`
- `node --test tests\validate-memory-runtime.test.js tests\tombstone-memory-runtime.test.js tests\supersede-memory-runtime.test.js tests\mutation-audit-shape.test.js tests\memory-lifecycle-scope-runtime-integration.test.js` passed `74/74`
- `npm test` passed `2852/2852`

Diff, docs, ledger, and changed-scope validation are part of commit closeout.

## Safety

No live recall/write execution, real memory/store/jsonl read, provider call, external MCP call, durable memory/audit write outside temp-local test stores, public MCP expansion, config/watchdog/startup change, remote action, readiness claim, or reliability claim occurred.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains unchanged.
