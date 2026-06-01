# CM-1318 Supersede Pair Record ID Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for supersede pair returned-record id normalization.

Changed:

- `src/core/SupersedeMemoryService.js`
- `tests/supersede-memory-runtime.test.js`

## Result

`SupersedeMemoryService.getPairRecords(...)` now normalizes records returned by `shadowStore.getRecordsByIds(...)` through the first non-empty `memoryId/memory_id` value before building the old/new pair map.

The normalized id is written into a cloned record before downstream policy and audit binding. This prevents shadow/object-model records with blank camel-case `memoryId` and populated snake_case `memory_id` from being rejected as missing pair records or later binding policy/audit work to an empty id.

## Validation

- `node --check src\core\SupersedeMemoryService.js`
- `node --check tests\supersede-memory-runtime.test.js`
- `node --test tests\supersede-memory-runtime.test.js tests\supersede-memory-runtime-entry.test.js tests\validate-memory-runtime.test.js tests\tombstone-memory-runtime.test.js` passed `49/49`
- `npm test` passed `2844/2844`
- `git diff --check`

Docs/ledger validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Boundary

- No live recall/write execution.
- No real memory/store/jsonl read.
- No provider call.
- No MCP external call.
- No durable memory/audit write outside temp-local tests.
- No public MCP expansion.
- No config/watchdog/startup change.
- No package/lock/env change.
- No remote action.
- No readiness, write reliability, recall reliability, rollback readiness, or RC readiness claim.
