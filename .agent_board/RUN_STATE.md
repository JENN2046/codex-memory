# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/board only |
| Current task | CM-0193 / P23.6-migration-import-export-readiness-plan |
| Current area | P23.6 migration/import-export readiness plan |
| Last pushed baseline | `ffcddd737dae458a9af233991a1e15ad6b98de50` on `origin/main` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Created P23.6 migration/import-export readiness plan. |
| Last validation | P23.6 docs validation passed: `git diff --check`, docs validation, and P23 docs trailing whitespace check. P23.5 docs validation passed earlier; P22 local deploy evidence remains `/health ok`, live `initialize/tools/list ok`, public MCP tools exactly three, `observe:http status=ok`, MCP/HTTP tests `12/12`. |
| Worktree summary | P23.6 docs/status/board edits only on top of local commits `b3c6bd9`, `a3b2d77`, `0e3e25b`, and `de64428`; P23 planning through P23.5 are locally committed but unpushed. No `src/`, tests, package, lockfile, MCP schema/tool implementation, validator implementation, SQLite migration apply, import/export apply, backup creation, restore, provider/model call, real memory preview, `.env`, tag movement, production deploy, UI, service install, watchdog install, startup task install, Codex/Claude config mutation, durable memory write, durable data rewrite, or unapproved mutation. |
| Mainline assumption | `origin/main` is the development base; approval request commit is `1ad3477b0f46eceef55608c0bbd3243c15681f38`; fresh gate target is `7fd17de624c0da76751e863e97302bed0dbec905`. |
| P22 status | Fresh gate refresh passed; security-fix RC artifact created as local Markdown only; tag `p22-rc-7fd17de` created and pushed; GitHub prerelease created; local HTTP MCP deploy/validation evidence chain recorded and closed; production deploy remains blocked pending separate A5 authorization. |
| P23 status | v1.0 Memory Kernel planning baseline through P23.3 are committed locally in `a3b2d77`; P23.4 is committed locally in `0e3e25b`; P23.5 is committed locally in `de64428`; P23.6 migration/import-export readiness plan is drafted locally. |
| Guarded auto-commit allowed | no; current phase says do not commit unless explicitly authorized |
| Safe-push readiness | no; user explicitly requested no push |
| Next planned action | Run P23.6 docs validation and report. Do not commit or push. Next recommended phase is `P23.7-v1.0-release-candidate-checklist`. Do not tag, release, production deploy, call providers, mutate config, install startup/watchdog, preview real memory, write durable memory, migrate/import-export apply, implement validators, expand MCP, change package/lockfile, or edit `.env` / secrets without separate explicit approval. |

## Notes

- Project health: strong.
- Governance health: strong.
- Current truth: P22 security fix superseded prior RC candidate; fresh gate refresh passed; new local Markdown RC artifact has been created; tag `p22-rc-7fd17de` has been created and pushed; GitHub prerelease has been created; local HTTP MCP deploy/validation evidence chain has been recorded and closed; P23 planning through P23.5 are committed locally; P23.6 migration/import-export readiness plan is drafted locally.
- Release state: `P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN_AFTER_LOCAL_P23_5_COMMIT`.
- Superseded artifact path: `docs/P22_RELEASE_CANDIDATE_ARTIFACT_806cc847.md`.
- Recommended next phase: `P23.7-v1.0-release-candidate-checklist`; request separate A5 approval only for production deploy, startup/watchdog install, client config switch, provider execution, durable write, migration/import-export apply, schema implementation/migration apply, validator implementation, or public MCP contract-breaking change.
- Backup creation and restore remain blocked.
- Live HTTP MCP startup, startup/watchdog installation, and HKCU Run edits remain blocked.
- Config mutation for Codex or Claude remains blocked.
- Provider calls remain blocked unless explicitly approved.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
