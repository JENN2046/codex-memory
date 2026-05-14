# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0090 / P13.6-import-export-safe-JSON-shape-tests |
| Current area | P13-object-model / import-export-shape |
| Last local commit | `232b71a feat: add vcp memory mapping dry run` |
| Last pushed baseline | `232b71a` |
| Last action | Added P13.6 fixture-only import/export-safe JSON shape fixture and tests. |
| Last validation | P13.6 validation passed: import/export shape test `16/16`; object model fixture `13/13`; round-trip fixture `18/18`; mapping fixture `20/20`; `npm test` `390/390`; `git diff --check`; docs validation. |
| Worktree summary | P13.6 fixture/tests/docs/board only. No `src/`, package, MCP schema/tool expansion, SQLite migration, import/export CLI, file generation, provider call, hard delete, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P13.6 passed `390/390` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13.5 landed in `origin/main` at `232b71a`. |
| Next planned action | Inspect final diff/file scope, then guarded local commit and safe-push readiness if clean. |

## Notes

- Current phase is `P13.6-import-export-safe-JSON-shape-tests`.
- Previous phase `P13.5-SQLite-diary-mapping-dry-run-CLI` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.7-migration-readiness-report`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.6 fixture/test/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, durable memory, import/export CLI/file generation, real DB/diary data, or public MCP behavior.
