# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/status/board |
| Current task | CM-0159 / P22.4-release-candidate-approval-packet-template |
| Current area | P22 release candidate approval packet template |
| Last pushed baseline | P22.3 rollback/support story pushed and verified at `ec95a798aee4aac3ff8272cc84bae3624027e0f8` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P22.4 approval packet template without executing the packet or any release-candidate operation. |
| Last validation | `git diff --check` passed; docs validation passed for P22.4. |
| Worktree summary | P22.4 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Guarded commit and safe-push if ready; next recommended phase is `P22.x-release-candidate-planning-closeout-review`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
