# HANDOFF.md — codex-memory

## Goal

Continue `P13.5-SQLite-diary-mapping-dry-run-CLI` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: `main`
- Base: `origin/main` / `e5c0406`
- Remote policy: A4.8 safe-push is allowed only after readiness is ready

## Current Area

P13-object-model / mapping-dry-run-cli

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
- P12.6 validate_memory internal CLI wrapper landed.
- P13 VCP-compatible memory object model planning landed.
- P13.1 object model fixture schemas landed.
- P13.2 object model round-trip fixture tests landed.
- Decision after P12.6: keep `validate_memory` internal-only and skip public `validate_memory` MCP proposal review.

## Completed In Current Batch

- Added `src/cli/vcp-memory-object-mapping-dry-run.js`.
- Added `tests/fixtures/vcp-memory-object-mapping-dry-run-v1.json`.
- Added `tests/vcp-memory-object-mapping-dry-run-cli.test.js`.
- Added npm script `vcp-memory:mapping:dry-run`.
- CLI is fixture-safe by default, reports `mutated=false`, rejects `--confirm/--apply/--migrate`, and does not read real DB/diary data.
- Updated P13 mapping plan, object model plan, next phase plan, status, backlog, and board state.

## Changed Files

- `src/cli/vcp-memory-object-mapping-dry-run.js`
- `tests/fixtures/vcp-memory-object-mapping-dry-run-v1.json`
- `tests/vcp-memory-object-mapping-dry-run-cli.test.js`
- `package.json`
- `docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md`
- `docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `node --test tests\vcp-memory-object-mapping-dry-run-cli.test.js` passed `11/11`.
- `npm run vcp-memory:mapping:dry-run -- --json` passed.
- `node --test tests\vcp-memory-object-mapping-fixture.test.js` passed `20/20`.
- `node --test tests\vcp-memory-object-round-trip.test.js` passed `18/18`.
- `npm test` passed `374/374`.
- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- No MCP public tool definitions are changed.
- No MCP schema is changed.
- `validate_memory` remains internal-only.

## Audit / Recall Impact

- P13.5 dry-run CLI does not change audit/runtime/recall behavior.
- Future mapping must preserve audit, lifecycle, scope, and import/export boundaries.
- Recall path is unchanged.

## Not Done

- No public MCP `validate_memory`.
- No MCP schema change.
- No `src/` changes.
- Tests changes are fixture-only and limited to P13.5 mapping dry-run CLI tests.
- Package change is limited to npm script `vcp-memory:mapping:dry-run`; no dependency/lockfile change.
- No SQLite migration or automatic `ALTER TABLE`.
- No import/export CLI.
- No runtime mapper.
- No real data scan.
- No real DB read.
- No real diary read.
- No hard delete.
- No real DB/memory write.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No other mutation tools.

## Remaining Risks

- Public MCP tool expansion remains explicitly approval-gated.
- No current blocker.
- Real migration remains separately approval-gated.

## Next Safe Step

Inspect final diff/file scope, then guarded local commit and safe-push readiness if clean.
