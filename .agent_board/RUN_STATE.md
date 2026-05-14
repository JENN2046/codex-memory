# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0086 / P13.2-object-model-round-trip-fixture-tests |
| Current area | P13-object-model / round-trip-fixtures |
| Last local commit | `ce9a2a9 test: lock vcp memory object model fixture` |
| Last pushed baseline | `ce9a2a9` |
| Last action | Added P13.2 fixture-only object envelope round-trip tests. |
| Last validation | P13.2 validation passed: round-trip targeted `18/18`; P13.1 fixture targeted `13/13`; `npm test` `343/343`; `git diff --check`; docs validation. |
| Worktree summary | P13.2 fixture/tests/docs/board only. No `src/`, package/lockfile, MCP schema/tool, SQLite migration, import/export runtime, provider call, hard delete, `.env`, dependency, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P13.2 full suite passed `343/343` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13.1 landed in `origin/main` at `ce9a2a9`. |
| Next planned action | Run requested P13.2 validation, inspect diff, then guarded local commit and safe-push readiness if clean. |

## Notes

- Current phase is `P13.2-object-model-round-trip-fixture-tests`.
- Previous phase `P13.1-object-model-fixture-schemas` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.3-SQLite-diary-mapping-dry-run-planning`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.2 fixture/tests/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, durable memory, import/export runtime, or runtime behavior.
