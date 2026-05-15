# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0177 / P22-security-fix-fresh-rc-gate-refresh-approval-request |
| Current area | P22 security-fix fresh RC gate refresh approval request |
| Last pushed baseline | `7fd17de624c0da76751e863e97302bed0dbec905` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added fresh gate refresh approval request draft for security-fix target `7fd17de624c0da76751e863e97302bed0dbec905`; prior `p22-rc-806cc847` is superseded and must not be reused or moved. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P22 security-fix fresh approval request docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, gate rerun, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; security fix HEAD and remote main are `7fd17de624c0da76751e863e97302bed0dbec905`. |
| P22 status | Fresh gate refresh approval request drafted for `7fd17de`; approval remains `NOT_APPROVED`; decision remains `BLOCKED_HARD_STOP`; suggested future tag is `p22-rc-7fd17de`. |
| Guarded auto-commit allowed | eligible after final diff inspection and staging checks |
| Safe-push readiness | allowed by A4.8 after validation and readiness checks pass |
| Next planned action | Validate docs, guarded commit, safe-push if ready, then wait for explicit fresh RC gate refresh approval. Do not run gates, create RC artifact, create/move/push tag, release, deploy, call providers, mutate config, start services, preview real memory, write durable memory, migrate/import-export apply, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 security fix superseded prior RC candidate; fresh gate refresh approval request drafted, not approved.
- Release state: `SECURITY_FIX_READY_FOR_FRESH_RC_GATE_REFRESH_APPROVAL`.
- Superseded artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next action: wait for explicit fresh RC gate refresh approval for `7fd17de624c0da76751e863e97302bed0dbec905`.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
