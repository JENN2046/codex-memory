# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0149 / P21.1-client-integration-inventory |
| Current area | P21 client integration inventory |
| Last pushed baseline | P21 client integration hardening planning pushed and verified at `f86c9d015463270350273a642e69b45953bdf553` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P21.1 client integration inventory without real config mutation, live HTTP observation, service start, watchdog operation, provider call, MCP expansion, or migration. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P21.1 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P21.1, then continue to `P21.2-client-scope-acceptance-fixture-review`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
