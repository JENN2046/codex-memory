# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0088 / P13.4-object-mapping-fixture-tests |
| Current area | P13-object-model / mapping-fixtures |
| Last local commit | `3165440 docs: plan vcp memory object mapping dry run` |
| Last pushed baseline | `3165440` |
| Last action | Added P13.4 object mapping fixture and fixture-only mapping preview tests. |
| Last validation | P13.4 validation passed: mapping fixture test `20/20`; object model fixture `13/13`; round-trip fixture `18/18`; `npm test` `363/363`; `git diff --check`; docs validation. |
| Worktree summary | P13.4 fixture/tests/docs only. No `src/`, package/lockfile, MCP schema/tool, SQLite migration, import/export runtime, runtime mapper, provider call, hard delete, `.env`, dependency, real DB/diary read, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P13.4 passed `363/363` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13.3 landed in `origin/main` at `3165440`. |
| Next planned action | Inspect final diff/file scope, then guarded local commit and safe-push readiness if clean. |

## Notes

- Current phase is `P13.4-object-mapping-fixture-tests`.
- Previous phase `P13.3-SQLite-diary-mapping-dry-run-planning` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.5-SQLite-diary-mapping-dry-run-CLI`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.4 fixture/test/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, durable memory, import/export runtime, runtime mapper, real DB/diary data, or runtime behavior.
