# Maintenance Backlog

更新时间：2026-05-31

## Purpose

This file is now a compact candidate pool, not the active execution queue and not a historical CM/Pxx ledger.

Use active surfaces for current work:

- [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
- [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)
- [STATUS.md](/A:/codex-memory/STATUS.md)
- [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)

## Current Candidate Order

1. Finish documentation-surface slimdown.
   - Current slices: `CM-1202`, `CM-1203`, `CM-1204`.
   - Goal: keep active status, backlog, handoff, checkpoint, task, validation, and ledger surfaces small.
   - Boundary: docs/board only; no runtime, no public MCP expansion, no readiness claim.

2. Close A5 / P66 runtime gaps one by one.
   - Use [docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md) and [docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md](/A:/codex-memory/docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md).
   - Each runtime action requires fresh Git facts, exact scope, exact approval where required, and fresh evidence binding.
   - Fixture-only or docs-only evidence must not be upgraded into runtime readiness.

3. Start personal RC dogfood only after the runtime gap route is clean enough.
   - Codex/Claude MCP connection.
   - Minimal true write/search/overview loop.
   - Observe, rollback, audit, and repair from real use.
   - Personal dogfood is not public release, production readiness, or `RC_READY`.

## Current Blockers

- `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains the controlling state.
- Real runtime gap closure requires separate exact runtime/A5 approval.
- Push, PR, tag, release, deploy, config/watchdog/startup changes, provider calls, real memory broad scans, durable memory/audit writes, migration/import/export/backup/restore apply, public MCP expansion, and readiness claims remain out of scope for docs-surface work.

## Archive

Historical backlog content before CM-1204 remains available through Git:

```powershell
git show abb1a26:MAINTENANCE_BACKLOG.md
git show 13922da:MAINTENANCE_BACKLOG.md
```

Earlier pre-CM0302 archive remains:

- [docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md](/A:/codex-memory/docs/archive/MAINTENANCE_BACKLOG_FULL_PRE_CM0302.md)

CM-1204 archive index:

- [docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md)

Repository reality, source behavior, and fresh command output outrank archived backlog text.
