# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/status/board |
| Current task | CM-0161 / P22-release-candidate-gate-refresh-approval-request |
| Current area | P22 release candidate A5 approval boundary |
| Last pushed baseline | P22.x closeout pushed and verified at `86c32f4d909e0d56aa84cbe723fbe4fd7dd13acc` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Drafted P22 gate refresh approval request as `DRAFT_NOT_APPROVED`; no gate was run. |
| Last validation | `git diff --check` passed; docs validation passed for draft approval request. |
| Worktree summary | Docs/board draft only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | not needed; worktree clean unless this board sync is committed |
| Safe-push readiness | blocked for RC work without explicit A5 approval |
| Next planned action | Guarded commit and safe-push if ready, then stop at A5 boundary unless the user explicitly approves the exact RC gate refresh packet. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
