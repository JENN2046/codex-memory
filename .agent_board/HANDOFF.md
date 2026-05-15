# HANDOFF.md - codex-memory

## Goal

Continue P20.1 startup/watchdog inventory without runtime mutation.

## Workspace

A:\codex-memory

## Branch

`main`

## Worktree

P20.1 inventory docs/status/board edits are validated locally and pending guarded commit.

## Current Area

P20 local production hardening startup/watchdog inventory

## Findings

- P20 planning was committed and pushed at `afaa64fe991a3f9458468cf3e6891cd8b29ed9a2`.
- P20 state reconciliation was committed and pushed at `d870c168f834095dd86033285cd1091c0c39f5a0`.
- P20.1 inventory identifies HTTP MCP startup and watchdog surfaces.
- `ensure-codex-memory-http.ps1` checks health and may start a hidden Node HTTP MCP process.
- `watch-codex-memory-http.ps1 -Once` may start HTTP MCP and writes watchdog logs.
- `ensure-codex-memory-http-watchdog.ps1` may start a long-running hidden watchdog process.
- `install-codex-memory-http-task.ps1` and `install-codex-memory-http-watchdog.ps1` write scheduled task or HKCU Run state and require explicit approval.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- `validate_memory` remains internal-only.

## Changed Files

- `docs/P20_STARTUP_WATCHDOG_INVENTORY.md`
- `docs/P20_LOCAL_PRODUCTION_HARDENING_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `git diff --check` passed.
- Docs validation passed.

## Not Done

- No `src/` changes.
- No runtime code changed.
- No tests or fixtures added.
- No package or lockfile changes.
- No MCP schema/tool changes.
- No SQLite migration.
- No import/export apply.
- No real DB or durable memory write.
- No real memory read preview.
- No provider smoke or provider benchmark.
- No service start.
- No watchdog start.
- No scheduled task install.
- No HKCU Run edit.
- No Codex / Claude config mutation.
- No tag, release, deploy, destructive cleanup, or unapproved remote action.

## Next Safe Step

Run diff/docs validation, guarded commit, safe-push if ready, then continue to `P20.2-health-readiness-dry-run-evidence`.
