# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0150 / P21.2-client-scope-acceptance-fixture-review |
| Current area | P21 client scope acceptance fixture review |
| Last pushed baseline | P21.1 client integration inventory pushed and verified at `f09a63b4ba5e68c4655dec37719b685aeb11e69d` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P21.2 client scope acceptance fixture review without new fixtures, runtime changes, real config mutation, live HTTP observation, provider call, MCP expansion, or migration. |
| Last validation | Targeted scope tests passed; `git diff --check` passed; docs validation passed. |
| Worktree summary | P21.2 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P21.2, then continue to `P21.3-Claude-acceptance-evidence-refresh-plan`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
