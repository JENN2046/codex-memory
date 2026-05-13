# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P7 / S-004 real-query-suite default dataset coverage |
| Current area | P7-vcp-parity-hardening |
| Last action | 已补齐 q5/q6/q7 fixture cases，并新增默认 suite 覆盖全部 `benchmarks/default-dataset.json` queries 的回归测试。 |
| Last validation | targeted query tests passed `14/14`; `npm run real-query-suite -- --json` reports `caseCount=8`, `assertedCount=8`, `passedCount=8`, `failedCount=0`; `npm run query:quality -- --json --dry-run` reports the same and `mutated=false`; `npm test` passed `184/184`. |
| Worktree summary | local S-004 source/test/docs/board changes pending guarded commit; no provider calls, no SQLite mutation. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0` |
| npm test | `184/184` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | eligible after final diff/staged review; user explicitly authorized commit and push for S-004 |
| Last checkpoint | `.agent_board/CHECKPOINT.md` current S-004 checkpoint |
| Next planned action | Run final diff checks, create guarded local commit, push to `origin/main`, then run post-push status/gate check. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
