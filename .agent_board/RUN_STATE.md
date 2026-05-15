# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0141 / P20.1-startup-watchdog-inventory |
| Current area | P20 local production hardening startup/watchdog inventory |
| Last local commit | P20 state reconciliation committed and safe-pushed at `d870c16` |
| Last pushed baseline | local `HEAD`, local `origin/main`, and remote `refs/heads/main` verified at `d870c168f834095dd86033285cd1091c0c39f5a0` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P20.1 startup/watchdog inventory docs and board/status pointers. |
| Last validation | P20.1 docs validation passed: `git diff --check`; docs validation. |
| Worktree summary | P20.1 docs/inventory/status/board edits only. No `src/`, tests, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory read preview, export file generation, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Planning committed and hash-verified; P20.1 inventory drafted locally. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit for P20.1 inventory |
| Next planned action | Validate and commit P20.1 inventory, then continue to P20.2 health/readiness dry-run evidence. |

## Notes

- P20.1 is inventory only.
- `start:http:install-task` and `start:http:watchdog:install` write scheduled task or HKCU Run state and remain hard stops without explicit approval.
- `start:http:ensure` may start a hidden HTTP MCP process and is not run in this inventory phase.
- `start:http:watchdog:once` may start HTTP MCP and write watchdog logs and is not run in this inventory phase.
- `start:http:watchdog:ensure` starts a long-running watchdog process and is not run in this inventory phase.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
