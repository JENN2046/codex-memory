# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0087 / P13.3-SQLite-diary-mapping-dry-run-planning |
| Current area | P13-object-model / mapping-dry-run-planning |
| Last local commit | `82a4463 test: lock vcp memory object round trip` |
| Last pushed baseline | `82a4463` |
| Last action | Added P13.3 SQLite/diary object mapping dry-run planning document. |
| Last validation | P13.3 docs validation passed: `git diff --check`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`. |
| Worktree summary | P13.3 docs/board planning only. No `src/`, tests, package/lockfile, MCP schema/tool, SQLite migration, import/export runtime, runtime mapper, provider call, hard delete, `.env`, dependency, real data scan, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | Not required for P13.3 docs-only planning |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13.2 landed in `origin/main` at `82a4463`. |
| Next planned action | Run docs validation, inspect diff, then guarded local commit and safe-push readiness if clean. |

## Notes

- Current phase is `P13.3-SQLite-diary-mapping-dry-run-planning`.
- Previous phase `P13.2-object-model-round-trip-fixture-tests` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.4-object-mapping-fixture-tests`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.3 docs/status/board updates. It must not modify `src/`, tests, package files, MCP schema/tools, SQLite schema, durable memory, import/export runtime, runtime mapper, or runtime behavior.
