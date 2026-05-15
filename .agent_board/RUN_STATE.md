# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0176 / P22-tag-only-approval-request |
| Current area | P22 tag-only approval request |
| Last pushed baseline | `3d312882899ad82d91ef124443de300486f8654b` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Updated P22 approval request to tag-only request; tag/release/deploy remain `NOT_APPROVED`; no tag created or pushed. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P22 tag-only approval request docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, gate rerun, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; pre-P22 tag-only pushed HEAD and remote main were `3d312882899ad82d91ef124443de300486f8654b`. |
| P22 status | P22 tag-only approval request drafted; tag approval remains `NOT_APPROVED`; GitHub release and deploy remain `NOT_APPROVED`. |
| Guarded auto-commit allowed | eligible after final diff inspection and staging checks |
| Safe-push readiness | allowed by A4.8 after validation and readiness checks pass |
| Next planned action | Guarded commit, safe-push if ready, then wait for explicit tag-only approval. Do not create tag, push tag, release, deploy, call providers, mutate config, start services, preview real memory, write durable memory, migrate/import-export apply, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 tag-only approval request drafted, not approved.
- Release state: `RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED`.
- Artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next action: wait for explicit tag-only approval.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
