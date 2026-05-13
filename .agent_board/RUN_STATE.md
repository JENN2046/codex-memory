# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P9 / selected P1 VCP memory-core scope/runtime/query integration |
| Current area | P9-codex-claude-client-scope |
| Last action | 从 `origin/codex/p1-vcp-memory-core-100-roadmap` 只集成可验证的 runtime / CLI / storage / recall / test 变更，排除陈旧状态文档与远端 `.agent_board`，并本地修复 schema enum、scope backfill、scope acceptance 覆盖问题。 |
| Last validation | targeted `node --test` 44/44；`npm test` 180/180；`npm run gate:mainline:strict` ok；`npm run scope:acceptance -- --json` ok；`git diff --check` passed；new-file whitespace/token scans clean。 |
| Worktree summary | current worktree carries a local uncommitted integration batch across package scripts, scope/query CLIs, runtime scope handling, storage/recall code, tests, docs scope-backfill policy, and `.agent_board`; no commit or push. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0` |
| npm test | `180/180` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | blocked on explicit commit approval — validation and final local checks are green; no push authorized |
| Last checkpoint | `.agent_board/CHECKPOINT.md` current local integration checkpoint |
| Next planned action | Await explicit instruction if a guarded local commit is desired; push remains separate explicit authorization. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
