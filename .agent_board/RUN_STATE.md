# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0089 / P13.5-SQLite-diary-mapping-dry-run-CLI |
| Current area | P13-object-model / mapping-dry-run-cli |
| Last local commit | `e5c0406 test: lock vcp memory object mapping preview` |
| Last pushed baseline | `e5c0406` |
| Last action | Added P13.5 fixture-safe VCP memory object mapping dry-run CLI, fixture, test, and npm script. |
| Last validation | P13.5 validation passed: CLI test `11/11`; mapping fixture regression `20/20`; round-trip regression `18/18`; CLI JSON smoke; `npm test` `374/374`; `git diff --check`; docs validation. |
| Worktree summary | P13.5 fixture/dry-run CLI/docs/board only. No MCP schema/tool expansion, SQLite migration, import/export apply/file generation, provider call, hard delete, `.env`, dependency, real DB/diary read, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P13.5 passed `374/374` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13.4 landed in `origin/main` at `e5c0406`. |
| Next planned action | Inspect final diff/file scope, then guarded local commit and safe-push readiness if clean. |

## Notes

- Current phase is `P13.5-SQLite-diary-mapping-dry-run-CLI`.
- Previous phase `P13.4-object-mapping-fixture-tests` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.6-import-export-safe-JSON-shape-tests`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.5 dry-run CLI/fixture/test/docs/status/board updates and the `vcp-memory:mapping:dry-run` npm script. It must not modify MCP schema/tools, SQLite schema, durable memory, import/export apply/runtime, real DB/diary data, or public MCP behavior.
