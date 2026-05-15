# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0165 / P22.6-release-candidate-artifact-manifest-shape |
| Current area | P22 release-candidate artifact manifest shape |
| Last pushed baseline | `34157599e7dd25aa348ece3fb7a6faa11ee7ae1f` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Defining P22.6 future RC artifact manifest JSON/Markdown shape with gate evidence summary, MCP freeze, internal-only `validate_memory`, mutation boundaries, known gaps, rollback story, support handoff, and approval status; no artifact generated. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P22.6 docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, gate rerun, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; current pushed HEAD and remote main are `34157599e7dd25aa348ece3fb7a6faa11ee7ae1f`. |
| P22 status | P22 gate refresh passed; release candidate artifact has not been created. |
| Guarded auto-commit allowed | eligible if user wants commit, but not required for this draft-only request |
| Safe-push readiness | not requested; this phase drafts approval request only |
| Next planned action | Guarded commit, safe-push if ready, then continue to P22.7. Do not run RC gates, create a worktree, checkout/reset/detach, start live HTTP MCP, call providers, preview real memory, mutate config, migrate/import-export apply, create RC artifacts, tag, release, or deploy. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 gate refresh passed.
- Release state: gate refresh passed; RC not created.
- Recommended action: P22-release-candidate-artifact-approval-request or docs-only maintenance.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
