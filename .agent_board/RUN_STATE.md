# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0091 / P13.7-migration-readiness-report |
| Current area | P13-object-model / migration-readiness |
| Last local commit | `dc03d4c test: lock vcp memory import export shape` |
| Last pushed baseline | `dc03d4c` |
| Last action | Added P13.7 read-only migration readiness CLI, fixture, test, and npm script. |
| Last validation | P13.7 validation passed: readiness CLI test `11/11`, readiness JSON smoke, `npm test` `401/401`, `git diff --check`, and docs validation. |
| Worktree summary | P13.7 read-only readiness CLI/docs/board only. No MCP schema/tool expansion, SQLite migration, import/export apply, provider call, hard delete, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | Passed for P13.7: `401/401` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13.7 migration readiness report validated locally. |
| Next planned action | Inspect final diff/file scope, then guarded local commit and safe-push readiness if clean; after P13.7, stop for P13 closeout review before P14. |

## Notes

- Current phase is `P13.7-migration-readiness-report`, validated locally and ready for guarded commit/safe-push readiness.
- Previous phase `P13.6-import-export-safe-JSON-shape-tests` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.x-closeout-review`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.7 readiness CLI/fixture/test/docs/status/board updates and the `vcp-memory:migration-readiness` npm script. It must not modify MCP schema/tools, SQLite schema, durable memory, import/export apply, real DB/diary data, or public MCP behavior.
