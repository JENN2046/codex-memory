# CM-1313 SQLite Shadow Memory ID Input Normalization

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for SQLite shadow-store memory id lookup inputs.

Changed:

- `src/storage/SqliteShadowStore.js`
- `tests/governance-schema.test.js`

## Result

`SqliteShadowStore` now normalizes memory id input lists before batch lookups:

- `getRecordsByIds(...)`
- `getRecordsScopeMap(...)`
- `getRecordsPolicyMap(...)`
- `getRecordsIsolationMap(...)`
- `getRecordsLifecycleStatusMap(...)`
- `getRecordsLifecycleScopeGovernanceMap(...)`

The shared normalizer trims ids, drops blank/null inputs, deduplicates ids, and accepts a single id value defensively. This prevents callers from missing records when upstream id arrays contain whitespace-padded ids or noisy empty entries.

## Validation

- `node --check src\storage\SqliteShadowStore.js`
- `node --check tests\governance-schema.test.js`
- `node --test tests\governance-schema.test.js`
- `node --test tests\governance-schema.test.js tests\policy-read-preflight.test.js tests\memory-lifecycle-scope-runtime-integration.test.js tests\recall-isolation-classification-runtime.test.js`
- `npm test` passed `2839/2839`
- `git diff --check`

Docs/ledger validation is recorded in `.agent_board/VALIDATION_LOG.md`.

## Boundary

- No live recall/write execution.
- No real memory/store/jsonl read.
- No provider call.
- No MCP external call.
- No durable memory/audit write outside temp-local test SQLite stores.
- No public MCP expansion.
- No config/watchdog/startup change.
- No package/lock/env change.
- No remote action.
- No readiness, write reliability, recall reliability, rollback readiness, or RC readiness claim.
