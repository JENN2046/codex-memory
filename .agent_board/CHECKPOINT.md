# CHECKPOINT.md - codex-memory

## CM-1206 Post-Push Git Fact Wording Checkpoint

Status: `COMPLETED_VALIDATED_NOT_READY`

Date: 2026-05-31

Purpose: prevent active status surfaces from treating validation-time `HEAD` / `origin/main` snapshots as current post-commit or post-push truth.

Compressed active files in this docs-surface follow-up:

- `MEMORY.md`
- `MAINTENANCE_BACKLOG.md`

Current wording rule:

- Do not self-pin latest post-commit SHA in active status surfaces.
- Use fresh `git status --short --branch` and `git log --oneline --decorate -n 10` before branch-sensitive decisions.

Archive/index:

- [docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md)
- [docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md)
- [docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md)

Current route preserved:

1. Documentation-surface slimdown.
2. A5 / P66 runtime gap closure.
3. Personal RC dogfood.

Validation:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`
- docs validation includes autopilot ledger consistency: latest task / ledger / validation are `CM-1206 / CM-1206 / CMV-1323`

Not validated:

- full test suite
- hardening suite
- mainline gates
- HTTP observe
- provider checks
- real memory tools
- runtime gap closure

Boundary:

- Docs/board only.
- No runtime/source/test/package/config/env changes.
- No provider/API, durable write, public MCP expansion, push, release, deploy, readiness, write reliability, or recall reliability claim.

## Current Historical Archive Rule

Historical active surfaces before CM-1203 remain available through Git:

```powershell
git show 13922da:STATUS.md
git show 13922da:.agent_board/HANDOFF.md
git show 13922da:.agent_board/CHECKPOINT.md
git show 13922da:.agent_board/TASK_QUEUE.md
git show 13922da:.agent_board/VALIDATION_LOG.md
git show 13922da:.agent_board/AUTOPILOT_LEDGER.md
git show abb1a26:MAINTENANCE_BACKLOG.md
git show abb1a26:MEMORY.md
```

Repository reality remains authoritative over archived status text.
