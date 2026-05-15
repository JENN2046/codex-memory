# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0145 / P20.3-rollback-backup-operations-plan |
| Current area | P20 local production hardening rollback/backup planning |
| Last pushed baseline | P20.2b fixture contract repair pushed and verified at `561cff790811f75cdcdf625d50050c841a308ea4` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P20.3 rollback/backup operations planning without real backup, restore, config mutation, service start, or migration. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P20.3 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Rollback/backup requirements are planned; real operations remain blocked without A5 approval. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P20.3, then continue to `P20.4-local-production-safety-checklist`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
