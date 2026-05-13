# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P7 / real-query-suite fixture-only baseline |
| Current area | P7-vcp-parity-hardening |
| Last action | 将 `benchmarks/real-query-suite/v1.json` 从 placeholder-only 样本替换为基于 `benchmarks/default-dataset.json` 的 5 条脱敏 fixture-only 查询，并让 query CLIs 输出 `fixtureOnlyCount` / `realCount`。 |
| Last validation | targeted query tests passed `11/11`; `npm run real-query-suite -- --json` reports `placeholderCount=0`, `fixtureOnlyCount=5`, `realCount=5`; `npm run query:quality -- --json --dry-run` reports the same and `mutated=false`; `npm test` passed `181/181`; `git diff --check` passed. |
| Worktree summary | local source/test/benchmark/status/board update; no provider calls, no SQLite mutation, no remote action. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0` |
| npm test | `181/181` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | eligible after final diff/staged review; push remains separate explicit authorization |
| Last checkpoint | `.agent_board/CHECKPOINT.md` current query-suite fixture-only checkpoint |
| Next planned action | Create guarded local commit if final diff remains scoped; next implementation candidate is fixture assertion runner for `mustContain` / `mustNotContain`. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
