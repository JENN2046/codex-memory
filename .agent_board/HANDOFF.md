# HANDOFF.md - codex-memory

## Goal

Plan a future redacted, opt-in, read-only real-memory query dry-run surface for P15.5.

## Workspace

A:\codex-memory

## Branch

`main`

## Worktree

Dirty with validated P15.5 docs/board planning changes until guarded commit.

## Current Area

P15 real-memory query dry-run planning

## Findings

- current main is `4aa0356`.
- latest runtime safety baseline is `41a5630`.
- P15.4 fixture recall dry-run standing gate is pushed to `origin/main`.
- `validate_memory` remains internal-only.
- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- P15.5 is planning only and does not authorize real memory read preview.

## Changed Files

- `docs/P15_REAL_MEMORY_QUERY_DRY_RUN_PLAN.md`
- `docs/P15_REAL_QUERY_QUALITY_GATE_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Validation

- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## Not Done

- No `src/` changes.
- No tests changed.
- No fixture data changed.
- No package or lockfile changes.
- No MCP schema/tool changes.
- No SQLite migration.
- No import/export apply.
- No real DB or durable memory write.
- No real memory read preview.
- No provider smoke or provider benchmark.
- No push yet for this phase.

## Next Safe Step

Create a guarded local commit. After that, next phase should be P15.6 query-quality closeout review; push still requires readiness.
