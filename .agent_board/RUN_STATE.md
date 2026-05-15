# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0173 / P22.12-release-publication-boundary-checklist |
| Current area | P22 release publication boundary checklist |
| Last pushed baseline | `5b6859b6de4ee274cc6676e190ee457b87661c40` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P22.12 release publication boundary checklist; no tag/release/deploy or excluded action performed. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | P22.12 docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag, release, deploy, UI, live HTTP MCP start, service start, service install, watchdog start, watchdog install, config mutation, gate rerun, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; pre-P22.12 pushed HEAD and remote main were `5b6859b6de4ee274cc6676e190ee457b87661c40`. |
| P22 status | P22 release publication boundary checklist drafted; tag/release/deploy remain `NOT_APPROVED`. |
| Guarded auto-commit allowed | eligible after final diff inspection and staging checks |
| Safe-push readiness | allowed by A4.8 after validation and readiness checks pass |
| Next planned action | Guarded commit, safe-push if ready, then continue to P22.13 post-artifact operator handoff. Do not tag, release, deploy, call providers, mutate config, start services, preview real memory, write durable memory, migrate/import-export apply, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 release publication boundary checklist drafted.
- Release state: `RC_ARTIFACT_CREATED_TAG_RELEASE_DEPLOY_NOT_PERFORMED`.
- Artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next action: complete P22.12 guarded commit / safe-push, then draft P22.13 post-artifact operator handoff.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
