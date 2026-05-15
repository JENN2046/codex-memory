# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board review |
| Current task | CM-0154 / P21.x-client-integration-hardening-closeout-review |
| Current area | P21 client integration hardening closeout |
| Last pushed baseline | P21.5 client integration standing gate summary pushed and verified at `cddff6a223e2ff016f152e8a0059b049ab248810` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P21.x closeout review and judged P22 release-candidate planning readiness. |
| Last validation | `git diff --check` passed; docs validation passed for P21.x. |
| Worktree summary | P21.x docs/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Validate and commit P21.x, then continue to `P22-release-candidate-planning`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
