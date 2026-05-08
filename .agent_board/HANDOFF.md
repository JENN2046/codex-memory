# HANDOFF.md — codex-memory

## Goal

Execute P1.0 through P1.8: land the VCP Memory Core 100% implementation plan, then build Phase 1 low-risk, verifiable, rollback-safe CLI tooling and docs. No push, no tag, no release, no env changes.

## Safe State

Runtime code is not being changed. `1628381 docs: record claude flash acceptance` is synchronized with `origin/main`. The local worktree change is a docs-only baseline sync pointing current-status docs at `1628381` / `CMV-0039`.

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: codex/p1-vcp-memory-core-100-roadmap (local only, not pushed)
- Worktree: P1.0 docs landed; P1.1-P1.8 in progress

## Queue Summary

- done: P1.0 VCP Memory Core 100% plan landed as docs-only
- in_progress: P1.1 Real MCP Scope Acceptance CLI
- blocked: none
- remaining: P1.1-P1.8 for tonight; no push/tag/release

## Changed Files

- `docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md`
- `README.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Evidence

- npm test: passed (`123/123`)
- gate:mainline:strict: passed — health 200, contract ok, test ok, compare 39/39 matched, rollback 39/39 rollback-ready
- compare suite: 39/39 matched
- rollback suite: 39/39 rollback-ready

## Runtime Notes

- MCP mode: HTTP mainline assumption, verify before runtime claims
- HTTP health: latest known `200` from gate
- Rollback readiness: latest known `39/39 rollback-ready`
- Audit impact: none expected
- Recall impact: none expected

## Blockers

- none

## Decisions

- Keep the `49537f6` push-after result as a board-only delayed note.
- Do not create checkpoint-20 unless a later batch needs a formal checkpoint.
- Treat provider benchmark records as sanitized evidence for provider/profile comparison, not as a replacement for compare / rollback / mainline gate.
- Keep checkpoint-19 as the latest independent checkpoint; board-only push-after gate results can stay in `.agent_board` until a later formal checkpoint is warranted.
- Phase E is closed; future donor/provider/docs polish belongs to maintenance-phase incremental work.
- `MAINTENANCE_BACKLOG.md` is now the maintenance-phase queue for donor/provider/docs follow-up work.
- Keep the `bcb2d84` push-after result as a board-only delayed note.
- Keep the `1628381` push-after result as a board-only delayed note.
- Product target is now Codex and Claude only; VCPToolBox remains donor/reference compatibility, not a service target.
- Claude Code local HTTP MCP is the first Claude acceptance path; model-side acceptance should now use `deepseek-ai/deepseek-v4-flash` per latest user instruction.
- Claude config write was explicitly authorized and completed.
- Do not push without explicit user approval.

## Next Safe Task

Commit P1.0 docs-only changes locally. Begin P1.1 scope acceptance CLI. Do not push.

## Warnings

- Verify repository reality before trusting this handoff.
- Do not push without explicit approval.
- Do not apply rollback config patches without explicit approval.
- Do not run profile confirm/apply without explicit approval.
