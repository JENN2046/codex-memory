# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A5-approval-request-draft |
| Current task | CM-0161 / P22-release-candidate-gate-refresh-approval-request |
| Current area | P22 release-candidate approval request drafting |
| Last pushed baseline | `289cb6cd9bf8d0f1479c14c2370def78a7388acf` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Switched P22 gate refresh approval request to two-field model: `rc_target_commit=806cc847cb37a3e428099b45871a4f1a13c4fa6f`, `approval_request_commit=289cb6cd9bf8d0f1479c14c2370def78a7388acf`; no RC gates executed. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | Approval-request draft/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, release candidate creation, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; current pushed HEAD and remote main are `289cb6cd9bf8d0f1479c14c2370def78a7388acf`. |
| P22 status | P22 planning is closed; release state remains `blocked_for_explicit_RC_approval`. |
| Guarded auto-commit allowed | eligible if user wants commit, but not required for this draft-only request |
| Safe-push readiness | not requested; this phase drafts approval request only |
| Next planned action | Guarded commit, safe-push if ready, then stop. Do not run RC gates, start live HTTP MCP, call providers, preview real memory, mutate config, migrate/import-export apply, create RC artifacts, tag, release, or deploy. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 planning closed.
- Release state: blocked for explicit RC approval.
- Recommended action: draft RC gate refresh approval request only.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
