# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P7 / S-005 query assertions in gate:ci |
| Current area | P7-vcp-parity-hardening |
| Last action | 已将 query assertion runner 接入 `gate:ci`，新增 `checks.queries.detail.caseCount/assertedCount/passedCount/failedCount` 输出，并更新 gate-ci 回归测试。 |
| Last validation | `node --test tests\gate-ci-cli.test.js` passed `2/2`; `npm run gate:ci -- --json` passed with query assertions `8/8` and CI-safe tests `171/171`; `npm test` passed `184/184`. |
| Worktree summary | local S-005 gate/test/docs/board changes pending final validation and guarded commit; no provider calls, no SQLite mutation. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0` |
| npm test | `184/184` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | eligible after final diff/staged review |
| Last checkpoint | `.agent_board/CHECKPOINT.md` current S-005 checkpoint |
| Next planned action | Run `git diff --check`, staged review, then create guarded local commit. Push requires explicit authorization. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
