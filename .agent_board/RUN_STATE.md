# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P1 / scope enforcement: push search scope into chunk SQL candidate selection |
| Current area | P9-codex-claude-client-scope |
| Last action | 已完成 `search_memory` scope SQL candidate pushdown：`project_id` / `workspace_id` / `client_id` / `visibility` 会先缩小 chunk 候选集，再由现有 post-filter 做 defense-in-depth 兜底。 |
| Last validation | `node --test tests\scope-filter.test.js` passed (`11/11`)；`npm test` passed (`143/143`)；`npm run gate:mainline:strict` passed；`git diff --check` passed with repo-known LF normalization warnings only. |
| Worktree summary | current worktree carries a scoped source/test/docs/board batch for SQL candidate pushdown and its regression coverage. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | `43/43 matched`, `43/43 rollback-ready`, `extendedMismatchCountTotal=0` |
| npm test | `143/143` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | yes for this scoped source/test/docs batch after diff inspection and validation; push remains gated and is only eligible under the user's current explicit session approval |
| Last checkpoint | [maintenance-acceptance-2026-05-08.md](/A:/codex-memory/logs/maintenance-acceptance-2026-05-08.md) |
| Next planned action | Inspect final diff, commit/push this batch if scope stays clean, then choose between deeper scope policy/audit semantics and `governance:report`. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
