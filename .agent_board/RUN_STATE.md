# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 read-only review + docs/board correction |
| Current task | P20.1-startup-watchdog-inventory reconciliation |
| Current area | P20 local production hardening / startup-watchdog inventory |
| Last pushed baseline | P22.2 release candidate gate matrix dry-run plan pushed and verified at `fb5284143de776a9f890cd329f015eb3914701eb` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Rechecked P20.1 startup/watchdog inventory against current `package.json` scripts and checked-in startup/watchdog scripts; corrected stale status/board wording that treated old P20.1/P22.2 commit states as current. |
| Last validation | `git diff --check` passed; docs validation passed for P20.1 reconciliation. |
| Worktree summary | Docs/board correction only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Guarded commit and safe-push if ready, then stop or continue only on explicit next-phase instruction. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
