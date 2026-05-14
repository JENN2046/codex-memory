# HANDOFF.md — codex-memory

## Goal

Continue `P13.6-import-export-safe-JSON-shape-tests` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: `main`
- Base: `origin/main` / `232b71a`
- Remote policy: A4.8 safe-push is allowed only after readiness is ready

## Current Area

P13-object-model / import-export-shape

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

- Added `tests/fixtures/vcp-memory-import-export-shape-v1.json`.
- Added `tests/vcp-memory-import-export-shape.test.js`.
- Fixture/test lock import/export-safe JSON envelope shape, refs, policy flags, deterministic checksum, dry-run-first import mode, `mutated=false`, and no-side-effect.
- Updated P13 mapping plan, object model plan, next phase plan, status, backlog, and board state.

## Changed Files

- `tests/fixtures/vcp-memory-import-export-shape-v1.json`
- `tests/vcp-memory-import-export-shape.test.js`
- `docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md`
- `docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `node --test tests\vcp-memory-import-export-shape.test.js` passed `16/16`.
- `node --test tests\vcp-memory-object-model-fixture.test.js` passed `13/13`.
- `node --test tests\vcp-memory-object-round-trip.test.js` passed `18/18`.
- `node --test tests\vcp-memory-object-mapping-fixture.test.js` passed `20/20`.
- `npm test` passed `390/390`.
- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- No MCP public tool definitions are changed.
- No MCP schema is changed.
- `validate_memory` remains internal-only.

## Audit / Recall Impact

- P13.6 fixture tests do not change audit/runtime/recall behavior.
- Future mapping must preserve audit, lifecycle, scope, and import/export boundaries.
- Recall path is unchanged.

## Not Done

- No public MCP `validate_memory`.
- No MCP schema change.
- No `src/` changes.
- Tests changes are fixture-only and limited to P13.6 import/export shape tests.
- No package or lockfile changes.
- No SQLite migration or automatic `ALTER TABLE`.
- No import/export CLI.
- No import/export file generation.
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
