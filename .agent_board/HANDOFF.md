# HANDOFF.md - codex-memory

## Goal

Continue from P22.3 rollback/support story into P22.4 RC approval packet template.

## Workspace

A:\codex-memory

## Branch

`main`

## Worktree

P22.3 docs/status/board edits are local and pending validation.

## Current Area

P22 release candidate rollback/support planning

## Findings

- P22.3 adds `docs/P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md`.
- P22.3 defines protected assets, rollback tiers, troubleshooting map, operator handoff fields, and required pre-RC evidence.
- P22.3 does not run gates, create backups, restore backups, start services, mutate config, call providers, read real memory content, create release candidates, tag, release, or deploy.
- P22.4 may prepare an explicit A5 approval packet template only; it must not execute the packet.
- Codex/Claude config mutation, `claude mcp` live commands, startup/watchdog install, service start, real memory preview, migration, import/export apply, provider calls, public MCP expansion, release candidate creation, tag, release, and deploy remain blocked without explicit A5 approval.

## Changed Files

- `docs/P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md`
- `docs/P22_RELEASE_CANDIDATE_PLAN.md`
- `docs/P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md`
- `docs/VCP_MEMORY_PARITY_ROADMAP.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `git diff --check` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed.

## Not Done

- No runtime code changed.
- No tests or fixtures changed.
- No package or lockfile changes.
- No MCP schema/tool changes.
- No SQLite migration.
- No import/export apply.
- No backup creation or restore.
- No real DB or durable memory write.
- No real memory content preview.
- No provider smoke or provider benchmark.
- No live HTTP observation.
- No service start.
- No watchdog start.
- No scheduled task install.
- No HKCU Run edit.
- No Codex / Claude config mutation.
- No `claude mcp` command.
- No release candidate creation.
- No tag, release, deploy, destructive cleanup, or unapproved remote action.

## Next Safe Step

Guarded commit and safe-push if ready. After that, the next recommended forward phase is `P22.4-release-candidate-approval-packet-template`.
