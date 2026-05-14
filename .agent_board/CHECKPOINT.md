# CHECKPOINT.md — codex-memory

## Current Goal

P12.3-controlled-write-dry-run-cli-prototypes：在不实现 runtime mutation、不新增 MCP public tools、不写真实 DB 的前提下，新增 fixture-driven controlled write dry-run CLI prototype。

## Current Area

P12-controlled-write-tools / dry-run-cli

## Current Status

P12.3 dry-run CLI prototype implementation completed locally. Current branch is `main`, base is `origin/main` / `b950bf3`.

This batch adds a fixture-driven dry-run CLI, fixture, tests, npm script, and docs/board notes only. It does not add MCP public tools, does not change MCP schema, does not perform SQLite migration, and does not write durable DB/memory state.

## Completed Work In This Batch

- Added `tests/fixtures/controlled-write-dry-run-v1.json`.
- Added `src/cli/controlled-write-dry-run.js`.
- Added `tests/controlled-write-dry-run-cli.test.js`.
- Added `npm run controlled-write:dry-run`.
- CLI reports `mutated=false`, `fixtureOnly=true`, `noDatabase=true`, `noDiaryWrite=true`, `noVectorWrite=true`, `noAuditLogWrite=true`, `noDurableMemoryWrite=true`, `noMcpPublicToolExpansion=true`, and `publicToolsFrozen=true`.
- CLI covers update/supersede/forget/validate/checkpoint/handoff and read-only `audit_memory`.
- CLI rejects `--confirm`, `--apply`, `--write`, and `--mutate`.
- CLI supports `--tool <candidate>` filtering and emits audit event previews.

## Changed Files

- `tests/fixtures/controlled-write-dry-run-v1.json`
- `src/cli/controlled-write-dry-run.js`
- `tests/controlled-write-dry-run-cli.test.js`
- `package.json`
- `docs/CONTROLLED_WRITE_TOOLS_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `node --test tests\controlled-write-dry-run-cli.test.js`：passed `9/9`
- `node --test tests\controlled-write-tools-fixture.test.js`：passed `13/13`
- `node --test tests\mutation-audit-shape.test.js`：passed `15/15`
- `npm run controlled-write:dry-run -- --json`：passed
- `npm run controlled-write:dry-run -- --json --tool forget_memory`：passed
- `npm test`：passed `270/270`
- `git diff --check`：passed
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`：passed

## Validation Not Run

- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No push / tag / release / deploy.

## Current Blockers

- None.

## Remaining Risks

- P12.4 proposal review must happen before any MCP public tool expansion.
- P12.5 first runtime mutation remains explicitly approval-gated.
- Current CLI is fixture-driven and must remain non-mutating.

## Next Safe Action

Continue to `P12.4-MCP-tool-proposal-review`; push requires explicit authorization.
