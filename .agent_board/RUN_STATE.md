# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P7 / S-006 gate:ci JSON schema docs and snapshot |
| Current area | P7-vcp-parity-hardening |
| Last action | 已把 `gate:ci` fixture-only JSON contract 写入 README / VALIDATION，并在 `tests/gate-ci-cli.test.js` 增加 schema snapshot 风格断言，锁住 top-level / summary / checks / queries.detail 字段集合。 |
| Last validation | `node --test tests\gate-ci-cli.test.js` passed `2/2`; `npm run gate:ci -- --json` passed with query assertions `8/8` and CI-safe tests `171/171`; `npm test` passed `184/184`; `git diff --check` passed. |
| Worktree summary | local S-006 docs/test/board changes pending final staged review and guarded commit; no provider calls, no SQLite mutation, no remote write. |
| Mainline assumption | HTTP MCP 7605 is reachable |
| Active-memory suite status | strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0` |
| npm test | `184/184` |
| Profile health | `ready` — vectors 205, 822 embedding cache, 0 legacy |
| Guarded auto-commit allowed | eligible after final diff/staged review |
| Last checkpoint | `.agent_board/CHECKPOINT.md` current S-006 checkpoint |
| Next planned action | Run final targeted validation and staged review, then create guarded local S-006 commit. Push requires explicit authorization. |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
