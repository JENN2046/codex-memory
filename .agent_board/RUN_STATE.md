# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0186 / P22-local-deploy-closeout |
| Current area | P22 local HTTP MCP deploy closeout |
| Last pushed baseline | `ffcddd737dae458a9af233991a1e15ad6b98de50` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Closed P22 local HTTP MCP deploy/validation evidence chain. |
| Last validation | Local deploy validation evidence: `/health ok`; live `initialize/tools/list ok`; public MCP tools exactly three; `observe:http status=ok`; MCP/HTTP tests `12/12`. Closeout docs validation passed: `git diff --check` and docs validation. |
| Worktree summary | P22 local deploy result/closeout docs/status/board edits only. No `src/`, tests, package, lockfile, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag movement, production deploy, UI, service install, watchdog install, startup task install, Codex/Claude config mutation, gate rerun, durable memory write, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; approval request commit is `1ad3477b0f46eceef55608c0bbd3243c15681f38`; fresh gate target is `7fd17de624c0da76751e863e97302bed0dbec905`. |
| P22 status | Fresh gate refresh passed; security-fix RC artifact created as local Markdown only; tag `p22-rc-7fd17de` created and pushed; GitHub prerelease created; local HTTP MCP deploy/validation evidence chain recorded and closed; production deploy remains blocked pending separate A5 authorization. |
| Guarded auto-commit allowed | no; user explicitly requested no commit |
| Safe-push readiness | no; user explicitly requested no push |
| Next planned action | Run docs validation and report. Do not commit or push. Next recommended phase is `P23-v1.0-memory-kernel-planning`. Do not tag, release, production deploy, call providers, mutate config, install startup/watchdog, preview real memory, write durable memory, migrate/import-export apply, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 security fix superseded prior RC candidate; fresh gate refresh passed; new local Markdown RC artifact has been created; tag `p22-rc-7fd17de` has been created and pushed; GitHub prerelease has been created; local HTTP MCP deploy/validation evidence chain has been recorded and closed.
- Release state: `SECURITY_FIX_GITHUB_RELEASE_CREATED_LOCAL_HTTP_MCP_DEPLOY_EVIDENCE_CLOSED_PRODUCTION_DEPLOY_BLOCKED`.
- Superseded artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next phase: `P23-v1.0-memory-kernel-planning`; request separate A5 approval only for production deploy, startup/watchdog install, client config switch, provider execution, durable write, or migration/import-export apply.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
