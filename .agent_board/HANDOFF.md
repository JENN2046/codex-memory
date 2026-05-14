# HANDOFF.md — codex-memory

## Goal

Continue `P13-VCP-compatible-memory-object-model-planning` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: `main`
- Base: `origin/main` / `caa8186`
- Remote policy: A4.8 safe-push is allowed only after readiness is ready

## Current Area

P13-object-model / docs-planning

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
- Decision after P12.6: keep `validate_memory` internal-only and skip public `validate_memory` MCP proposal review.

## Completed In Current Batch

- Added P13 object-model planning doc.
- Defined object families, `MemoryRecord` vNext fields, backward compatibility, mapping plan, migration strategy, risk register, validation plan, and non-goals.
- Updated roadmap, next phase plan, controlled-write plan, status, backlog, and board state.

## Changed Files

- `docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md`
- `docs/CONTROLLED_WRITE_TOOLS_PLAN.md`
- `docs/VCP_MEMORY_PARITY_ROADMAP.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- No MCP public tool definitions are changed.
- No MCP schema is changed.
- `validate_memory` remains internal-only.

## Audit / Recall Impact

- P13 planning does not change audit/runtime/recall behavior.
- Future object mapping must preserve audit, lifecycle, and scope boundaries.
- Recall path is unchanged.

## Not Done

- No public MCP `validate_memory`.
- No MCP schema change.
- No `src/` changes.
- No tests changes.
- No package or lockfile changes.
- No SQLite migration or automatic `ALTER TABLE`.
- No hard delete.
- No real DB/memory write.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No other mutation tools.

## Remaining Risks

- Public MCP tool expansion remains explicitly approval-gated.
- Object-model fixtures and dry-run mapping remain future phases.
- Real migration remains separately approval-gated.

## Next Safe Step

Inspect diff boundaries, then guarded local commit and safe-push readiness if clean.
