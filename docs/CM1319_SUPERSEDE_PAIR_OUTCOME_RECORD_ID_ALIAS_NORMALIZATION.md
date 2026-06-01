# CM-1319 Supersede Pair Outcome Record ID Alias Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for supersede pair outcome preview record id normalization.

Changed:

- `src/core/MemorySupersedePairOutcomeHelper.js`
- `tests/memory-supersede-pair-outcome-helper.test.js`

## Result

`MemorySupersedePairOutcomeHelper` now normalizes current projection records through the first non-empty `memoryId/memory_id` value before building the old/new pair record map.

This prevents no-apply pair outcome and audit-plan previews from treating projection records as missing when they expose blank camel-case `memoryId` and populated snake_case `memory_id`. The generated preview keeps old/new memory ids and audit refs populated.

## Validation

- `node --check src\core\MemorySupersedePairOutcomeHelper.js`
- `node --check tests\memory-supersede-pair-outcome-helper.test.js`
- `node --test tests\memory-supersede-pair-outcome-helper.test.js tests\memory-supersede-runtime-prep-helper.test.js tests\durable-governance-shadow-projection-preview.test.js tests\supersede-memory-runtime.test.js` passed `35/35`
- `npm test` passed `2845/2845`
- `git diff --check`

Docs/ledger validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Boundary

- No live recall/write execution.
- No real memory/store/jsonl read.
- No provider call.
- No MCP external call.
- No durable memory/audit write.
- No public MCP expansion.
- No config/watchdog/startup change.
- No package/lock/env change.
- No remote action.
- No readiness, write reliability, recall reliability, rollback readiness, or RC readiness claim.
