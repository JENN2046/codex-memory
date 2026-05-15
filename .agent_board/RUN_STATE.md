# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0181 / P22-security-fix-tag-only-approval-request |
| Current area | P22 security-fix tag-only approval request |
| Last pushed baseline | `ffcddd737dae458a9af233991a1e15ad6b98de50` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Drafted tag-only approval request for proposed tag `p22-rc-7fd17de`; prior `p22-rc-806cc847` remains superseded and must not be reused or moved. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P22 security-fix tag-only approval request docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag creation, tag movement, tag push, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, gate rerun, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; approval request commit is `1ad3477b0f46eceef55608c0bbd3243c15681f38`; fresh gate target is `7fd17de624c0da76751e863e97302bed0dbec905`. |
| P22 status | Fresh gate refresh passed; new security-fix RC artifact created as local Markdown only; tag-only approval request drafted. No tag/release/deploy. |
| Guarded auto-commit allowed | eligible after final diff inspection and staging checks |
| Safe-push readiness | allowed by A4.8 after validation and readiness checks pass |
| Next planned action | Validate docs, guarded commit, safe-push if ready, then wait for explicit tag-only approval for `p22-rc-7fd17de`. Do not run gates, create/move/push tag, release, deploy, call providers, mutate config, start services, preview real memory, write durable memory, migrate/import-export apply, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 security fix superseded prior RC candidate; fresh gate refresh passed; new local Markdown RC artifact has been created; tag-only approval is being requested.
- Release state: `SECURITY_FIX_RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED`.
- Superseded artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next action: wait for explicit tag-only approval for `p22-rc-7fd17de`.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
