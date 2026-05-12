# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P8 / soft read-policy preflight |
| Current area | P8-memory-governance |
| Last action | 已完成 fixture-backed `policy-read-preflight`：用 mixed governance/status/visibility records 证明当前默认读路径仍然宽松，并量化假设中的 status + private visibility soft policy 会收窄多少结果。 |
| Last validation | `node --test tests\policy-read-preflight.test.js` `2/2`、`npm test` `150/150`、`git diff --check`、`validate-local.ps1 -Area docs` 全部通过；`TASK_QUEUE` / docs / checkpoint 已同步。 |
| Worktree summary | current worktree carries a narrow preflight batch across tests, docs, and `.agent_board`; no runtime behavior, MCP contract, or config changes. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | `43/43 matched`, `43/43 rollback-ready`, `extendedMismatchCountTotal=0` |
| npm test | `150/150` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | yes — validation passed, diff remains scoped to tests/docs/`.agent_board`, and this session explicitly allows judged push after guarded commit |
| Last checkpoint | [maintenance-acceptance-2026-05-08.md](/A:/codex-memory/logs/maintenance-acceptance-2026-05-08.md) |
| Next planned action | Inspect final diff, perform guarded commit, then push this scoped `PL-2` preflight batch under the current standing authorization. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
