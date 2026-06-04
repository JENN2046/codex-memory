# CM-1459 Lifecycle Migration and Release Gate Source/Test

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_REAL_DB_APPLY_NO_PUBLIC_MCP_EXPANSION`

## Purpose

CM-1459 implements the next local source/test slice from the post-review plan:

- add a guarded lifecycle SQLite migration CLI for schema apply behind `--confirm --backup <path>`
- keep the existing lifecycle dry-run CLI read-only
- reinforce the readonly `audit_memory` draft with a future public exposure approval packet
- add local release gate package scripts for migration, parity, and release-candidate subsets

## Implemented Boundary

`src/cli/lifecycle-sqlite-migrate.js` is a separate CLI from `lifecycle-sqlite-dry-run.js`. By default it reports migration requirements without mutation. A confirmed apply requires an unused backup path and is tested only against temp SQLite databases.

The migration adds lifecycle columns and backfills missing `status` values to `active`. It does not delete records, rewrite memory content, scan raw stores, read real memory, call providers, change public MCP tools, or claim readiness.

`audit_memory` remains unregistered. Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.

## Scripts

CM-1459 adds:

```text
npm run test:migration
npm run test:parity
npm run test:release-candidate
```

These scripts use `src/cli/run-release-gate-tests.js` and are local aggregation gates only. `test:release-candidate` reports the contract status `RC_NOT_READY_BLOCKED`; passing it is not release readiness and is not `RC_READY`.

## Validation

Planned closeout validation:

```text
node --check src\cli\lifecycle-sqlite-migrate.js
node --check src\cli\run-release-gate-tests.js
node --test tests\lifecycle-sqlite-dry-run-cli.test.js tests\lifecycle-sqlite-migrate-cli.test.js
npm run test:migration
npm run test:parity
npm run test:release-candidate
git diff --check
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Boundary

CM-1459 does not execute a real lifecycle migration apply, does not touch a real memory DB, does not run provider/API calls, does not start daemon/runtime services, does not use bearer-token material, does not call memory tools, does not scan raw audit/jsonl/SQLite/vector/cache stores, does not change config/watchdog/startup, does not expand public MCP tools, does not perform remote action, and does not claim readiness or `RC_READY`.
