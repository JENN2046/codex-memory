# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0151 / P21.3-Claude-acceptance-evidence-refresh-plan |
| Current area | P21 Claude acceptance evidence refresh planning |
| Last pushed baseline | P21.2 client scope acceptance fixture review pushed and verified at `843cf52203fd694ed0fd831d3776fb7e9c9536cd` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P21.3 Claude acceptance evidence refresh plan without running `claude mcp`, live HTTP observation, provider/model call, config mutation, service start, MCP expansion, or migration. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P21.3 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P21.3, then continue to `P21.4-client-privacy-boundary-fixture-tests`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
