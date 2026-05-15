# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning |
| Current task | CM-0152 / P21.4-client-privacy-boundary-fixture-tests |
| Current area | P21 client privacy boundary fixture tests |
| Last pushed baseline | P21.3 Claude acceptance evidence refresh plan pushed and verified at `977918759d19b1998a61317c2ec782a671fa50c7` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P21.4 fixture-only client privacy boundary test without runtime changes, real config mutation, live HTTP observation, provider/model call, MCP expansion, or migration. |
| Last validation | pending targeted fixture test, `npm test`, diff check, and docs validation. |
| Worktree summary | P21.4 fixture/test/docs/status/board edits only. No `src/`, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | Closed as evidence-ready and blocked for apply. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Validate and commit P21.4, then continue to `P21.5-client-integration-standing-gate-summary`. |

## Notes

- Backup creation and restore are real durable-state operations and remain blocked.
- Startup/watchdog installation and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
