# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0146 / P20.4-local-production-safety-checklist |
| Current area | P20 local production hardening safety checklist |
| Last pushed baseline | P20.3 rollback/backup operations plan pushed and verified at `1d5b0a8f5bf689b6fde6e7124eda875c069e88d5` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P20.4 local production safety checklist without real backup, restore, config mutation, service start, watchdog operation, or migration. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P20.4 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Safety checklist is planned; real operations remain blocked without A5 approval. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P20.4, then continue to `P20.x-local-production-hardening-closeout-review`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
