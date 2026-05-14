# HANDOFF.md — codex-memory

## Goal

Continue `P12.6-validate-memory-internal-cli-wrapper` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: `main`
- Base: `origin/main` / `6332d30`
- Remote policy: A4.8 safe-push is allowed only after readiness is ready

## Current Area

P12-controlled-write-tools / validate-memory-internal-cli

## Completed Before This Batch

- P12 controlled write planning landed.
- P12.1 fixture schemas landed.
- P12.2 mutation audit shape tests landed.
- P12.3 controlled write dry-run CLI prototypes landed.
- P12.4 MCP tool proposal review landed.
- A4.8 Safe Project Operator Rail landed.
- P12.5 runtime mutation approval gate landed.
- P12.5 validate_memory runtime fixture tests landed.
- P12.5 internal validate_memory runtime service landed.
- P12.5 validate_memory implementation plan / rollback story landed.
- P12.5 validate_memory internal runtime review landed with PASS.

## Completed In Current Batch

- Added local internal `validate-memory` CLI wrapper.
- Added targeted CLI tests for dry-run, confirmed apply, forbidden states, secret-like evidence, missing lifecycle column, raw `workspace_id`, unknown tool/mode, and MCP public tools frozen.
- Added `validate-memory` npm script.
- Updated P12.5/P12.6 docs, status, backlog, and board state.

## Changed Files

- `src/cli/validate-memory.js`
- `tests/validate-memory-cli.test.js`
- `package.json`
- `docs/P12_5_VALIDATE_MEMORY_RUNTIME_IMPLEMENTATION_PLAN.md`
- `docs/P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md`
- `docs/CONTROLLED_WRITE_TOOLS_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `node --test tests\validate-memory-cli.test.js` passed `12/12`.
- `node --test tests\validate-memory-runtime.test.js` passed `9/9`.
- `node --test tests\validate-memory-runtime-fixture.test.js` passed `11/11`.
- `node --test tests\mcp-contract.test.js` passed `7/7`.
- `npm test` passed `312/312`.
- `npm run validate-memory -- --json --memory-id dry-run-example --reason "manual review" --evidence "manual evidence" --actor-client-id codex --request-source cli` passed with `dryRun=true`, `mutated=false`, and audit preview.
- `npm run gate:ci` passed.
- `npm run gate:mainline:strict` passed.
- `npm run lifecycle:sqlite:dry-run -- --json` passed with `mutated=false`.
- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- No MCP public tool definitions are changed.
- No MCP schema is changed.

## Audit / Recall Impact

- CLI dry-run emits audit preview only and does not append audit.
- Confirmed apply is delegated to `ValidateMemoryService`, which writes audit only after approved lifecycle update succeeds.
- Recall path is unchanged.

## Not Done

- No public MCP `validate_memory`.
- No MCP schema change.
- No lockfile/dependency change.
- No SQLite migration or automatic `ALTER TABLE`.
- No hard delete.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No other mutation tools.

## Remaining Risks

- Public MCP tool expansion remains explicitly approval-gated.
- Existing DBs without lifecycle status columns will reject validation instead of migrating.

## Next Safe Step

Inspect diff boundaries, then guarded local commit and safe-push readiness if clean.
