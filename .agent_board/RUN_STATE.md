# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0156 / P22.1-release-candidate-readiness-inventory |
| Current area | P22 release candidate readiness inventory |
| Last pushed baseline | P22 release candidate planning pushed and verified at `a05c2ce81be1fe2013eceef9472ad974cd7a4440` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P22.1 readiness inventory without running heavy/live gates or RC implementation. |
| Last validation | `git diff --check` passed; docs validation passed for P22.1. |
| Worktree summary | P22.1 docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Validate and commit P22.1, then continue to `P22.2-release-candidate-gate-matrix-dry-run-plan`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
