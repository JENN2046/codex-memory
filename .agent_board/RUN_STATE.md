# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0084 / P13-VCP-compatible-memory-object-model-planning |
| Current area | P13-object-model / docs-planning |
| Last local commit | `caa8186 feat: add validate_memory internal CLI` |
| Last pushed baseline | `caa8186` |
| Last action | Completed P13 object-model planning after deciding to keep `validate_memory` internal-only. |
| Last validation | P13 docs validation passed: `git diff --check`; `validate-local.ps1 -Area docs`. P12.6 baseline passed CLI `12/12`, full suite `312/312`, `gate:ci`, strict gate, lifecycle dry-run. |
| Worktree summary | P13 docs/status/board planning only. No `src/`, tests, package/lockfile, MCP schema/tool, SQLite migration, provider call, hard delete, `.env`, dependency, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | not required for P13 docs-only planning unless scope changes |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P12.6 validate_memory internal CLI landed in `origin/main` at `caa8186`. |
| Next planned action | Final validation, guarded commit, then safe-push readiness and safe-push if ready. |

## Notes

- Current phase is `P13-VCP-compatible-memory-object-model-planning`.
- Previous phase `P12.6-validate-memory-internal-cli-wrapper` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.1-object-model-fixture-schemas`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13 planning docs/status/board updates. It must not modify `src/`, tests, package files, MCP schema/tools, SQLite schema, durable memory, or runtime behavior.
