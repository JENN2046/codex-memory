# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4-Sustained Local Autopilot |
| Current task | P11.8-lifecycle-read-policy-runtime-flag-implementation |
| Current area | P11-memory-lifecycle-core / lifecycle-read-policy-runtime |
| Last local commit | `63482b4 docs: quarantine stale p1 roadmap branch` |
| Last pushed baseline | `63482b4` |
| Last action | Implemented default-off lifecycle read-policy runtime flag for ordinary `search_memory`. |
| Last validation | Targeted lifecycle/MCP tests passed; `npm test` passed after local HTTP ensure; `gate:ci`, `gate:mainline:strict`, `scope:acceptance`, and `lifecycle:sqlite:dry-run` passed. |
| Worktree summary | Runtime/test/docs/board changes pending; no `package.json`, `.env`, dependency, migration, provider call, stale-branch merge/rebase/cherry-pick, push, tag, release, or deploy. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest strict gate compare `43/43 matched`, rollback `43/43 rollback-ready`, `coreMismatchCountTotal=0`, `extendedMismatchCountTotal=0`. |
| npm test | Passed: `233/233` after `npm run start:http:ensure` restored local HTTP health. |
| Profile health | Not run in this batch. |
| Guarded auto-commit allowed | not requested in this batch |
| Last checkpoint | P11.8 runtime flag implemented and validated locally. |
| Next planned action | Inspect final diff, stop without push, then prepare guarded local commit only if user requests. |

## Notes

- `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` defaults to `false`.
- Flag false preserves backward-compatible ordinary recall behavior.
- Flag true keeps `active` / `stale`, filters `proposal` / `rejected` / `superseded` / `tombstoned`, and records low-risk audit summary fields.
- Missing lifecycle status column with flag true fail-safe hides candidates and records `lifecycleColumnAvailable=false`.
- P11.8 does not add MCP public tools, does not run SQLite migration, and does not write provider/profile state.
