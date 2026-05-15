# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0180 / P22-security-fix-rc-artifact-docs-only-creation |
| Current area | P22 security-fix RC artifact docs-only creation |
| Last pushed baseline | `0445f500e55ebedb84036ca80b0df0067fcbb31a` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Created approved local Markdown artifact `docs/P22_RELEASE_CANDIDATE_ARTIFACT_7fd17de.md`; prior `p22-rc-806cc847` remains superseded and must not be reused or moved. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P22 security-fix RC artifact docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, gate rerun, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; approval request commit is `1ad3477b0f46eceef55608c0bbd3243c15681f38`; fresh gate target is `7fd17de624c0da76751e863e97302bed0dbec905`. |
| P22 status | Fresh gate refresh passed; new security-fix RC artifact created as local Markdown only. No tag/release/deploy. |
| Guarded auto-commit allowed | eligible after final diff inspection and staging checks |
| Safe-push readiness | allowed by A4.8 after validation and readiness checks pass |
| Next planned action | Validate docs, guarded commit, safe-push if ready, then request explicit tag-only approval for `p22-rc-7fd17de` if publication should continue. Do not run gates, create/move/push tag, release, deploy, call providers, mutate config, start services, preview real memory, write durable memory, migrate/import-export apply, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 security fix superseded prior RC candidate; fresh gate refresh passed; new local Markdown RC artifact has been created.
- Release state: `SECURITY_FIX_RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED`.
- Superseded artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next action: request explicit tag-only approval for `p22-rc-7fd17de` if publication should continue.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
