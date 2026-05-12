# FILE_LOCKS.md — codex-memory

Purpose: prevent temporary Workers from editing the same files blindly.

Locks are advisory but binding for Codex sessions. A Worker must stop if its task needs a locked file owned by another active task.

| Lock ID | Status | Owner | Task | Files / Globs | Reason | Created | Release Condition |
|---|---|---|---|---|---|---|---|
| FL-0001 | released | commander | governance-rail-bootstrap | `AGENTS.md`; `.agent_board/RUN_STATE.md`; `.agent_board/HANDOFF.md`; `.agent_board/FILE_LOCKS.md`; `.agent_board/RISK_REGISTER.md` | Bootstrap Verifier protocol, file locks, risk register, and board drift calibration | 2026-05-12 | Released after local diff inspection and validation |
| FL-0002 | released | worker | worker-trial-status-drift | `STATUS.md` | Commander -> Worker -> Verifier trial: correct current status drift only | 2026-05-12 | Released after Worker PASS, docs validation, and first Verifier review; board cleanup completed |
| FL-0003 | released | commander | CM-0038-4-agent-autopilot-activation | `.agent_board/RUN_STATE.md`; `.agent_board/TASK_QUEUE.md`; `.agent_board/HANDOFF.md`; `.agent_board/CHECKPOINT.md`; `.agent_board/FILE_LOCKS.md`; `.agent_board/RISK_REGISTER.md`; `.agent_board/VALIDATION_LOG.md`; `.agent_board/DECISIONS.md` | Refresh control-plane state for `Single-Window 4-Agent Compact Autopilot` without touching dirty source files | 2026-05-12 | Released after board validation and final read-only Verifier PASS |
| FL-0004 | released | commander | dirty-source-quarantine | `src/app.js`; `src/core/MemoryWriteService.js`; `src/storage/DiaryStore.js`; `src/storage/SqliteShadowStore.js`; `src/recall/KnowledgeBaseSyncService.js`; `src/recall/ChunkIndexingService.js`; `src/cli/gate-ci.js`; `src/cli/mainline-gate.js`; `tests/scope-filter.test.js` | Prevent temporary Workers from editing or committing the existing dirty source batch until CM-0039/CM-0040 are contracted and validated | 2026-05-12 | Released after CM-0039/CM-0040 validation and code review follow-up passed |

## Rules

- Use one row per active task or Worker.
- Keep locks narrow: exact files are preferred over directories.
- Do not lock `.env`, secrets, dependency manifests, runtime data, or generated durable data unless the user explicitly approved that work.
- Mark a lock `released` after the task is done, blocked, or abandoned.
- If two tasks need the same file, Commander must serialize the work.
