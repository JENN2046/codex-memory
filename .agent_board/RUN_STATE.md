# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P7 / real-query-suite fixture assertion runner |
| Current area | P7-vcp-parity-hardening |
| Last action | 已实现共享 fixture assertion runner；`real-query-suite` / `query:quality` 现在真实校验 `mustContain` / `mustNotContain`，并补了坏 fixture 非零退出回归。 |
| Last validation | targeted query tests passed `13/13`; `npm run real-query-suite -- --json` reports `assertedCount=5`, `passedCount=5`, `failedCount=0`; `npm run query:quality -- --json --dry-run` reports the same and `mutated=false`; `npm test` passed `183/183`. |
| Worktree summary | local source/test/docs/board changes for query-suite assertion runner; no provider calls, no SQLite mutation, no remote action. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0` |
| npm test | `183/183` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | eligible after final diff check and scoped staging; push remains separate explicit authorization |
| Last checkpoint | `.agent_board/CHECKPOINT.md` current query-suite assertion-runner checkpoint |
| Next planned action | Run `git diff --check`, inspect/stage intended files, create guarded local commit, then stop before push unless explicitly authorized. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
