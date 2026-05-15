# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 tests/docs/board |
| Current task | CM-0162 / P20.1-startup-watchdog-inventory / CI failure reconciliation |
| Current area | P20 CI-safe fixture contract reconciliation |
| Last pushed baseline | `591adf79863e1d2ed20232c0ca54b5711ff8c3ef` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Reconciled current GitHub Actions failure: Linux CI `npm test` failed `470/472` on donor ranking and TagMemo fixture contracts; narrowed fixture/test assertions only. |
| Last validation | Targeted donor ranking `2/2` passed; targeted TagMemo `3/3` passed; local `npm test` passed `472/472`; `npm run gate:ci -- --json` passed with CI-safe tests `457/457`, compare/rollback `43/43`, queries `14/14`. |
| Worktree summary | Fixture/test/status/board edits only. No `src/`, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base, but current pushed CI is red until this fixture-only reconciliation is committed and pushed. |
| P20 status | Startup/watchdog inventory remains complete; current work is CI failure reconciliation, not startup/watchdog implementation. |
| Guarded auto-commit allowed | pending final diff/docs validation and scope check |
| Safe-push readiness | pending guarded commit; push is needed to verify Linux CI, subject to A4.8 safe-push readiness |
| Next planned action | Run `git diff --check`, docs validation, inspect diff, then guarded commit / safe-push if ready. Stop before RC gate refresh / implementation unless explicit A5 approval is provided. |

## Notes

- The remote CI failure is not a startup/watchdog runtime failure.
- Donor ranking multi-topic near-tie no longer treats memory label numbers as a cross-platform hard contract.
- TagMemo audit now permits either same-bucket alpha sibling as `topMemoryId` while preserving result set, tag interleave, and safety boundaries.
- Backup creation and restore remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
