# codex-memory Memory Index

更新时间：2026-05-31

## Purpose

This file is now a compact historical memory index, not a current status source and not a cross-session handoff ledger.

Use current surfaces for live facts:

- [STATUS.md](/A:/codex-memory/STATUS.md)
- [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
- [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
- [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)
- [.agent_board/HANDOFF.md](/A:/codex-memory/.agent_board/HANDOFF.md)

## Current Memory Boundary

- Historical notes in the old `MEMORY.md` were snapshots from earlier project phases, especially 2026-05-06 and older Phase C/D/E work.
- Those snapshots are useful as context, but they are not authoritative for current branch state, runtime readiness, validation, or next-step decisions.
- Current repository reality, source behavior, fresh command output, `STATUS.md`, and `.agent_board` active ledgers outrank old memory snapshots.

## Archive

The full pre-CM-1205 memory file remains available through Git:

```powershell
git show abb1a26:MEMORY.md
git show 13922da:MEMORY.md
```

Archive index:

- [docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md)

## Current Route Reminder

The formal route remains:

1. Finish documentation-surface slimdown.
2. Close A5 / P66 runtime gaps one by one.
3. Start personal RC dogfood after runtime gap evidence is clean enough.

`NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` remains in force. This memory-index compression does not change runtime behavior, execute provider/API calls, access real memory tools, expand public MCP tools, push, release, deploy, or claim readiness/reliability.
