# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0100 / P14.6-compare-rollback-standing-gate-summary |
| Current area | P14-donor-compatibility / standing gate summary |
| Last local commit | `3afc9c7 test: add p14 ranking parity fixtures` |
| Last pushed baseline | `3afc9c70e44efb68183c8710412c1b7ff9b40fff` |
| Last action | Added P14.6 donor parity standing gate summary and board/status pointers. |
| Last validation | P14.6 validation passed: standard-suite compare `43/43 matched`; standard-suite rollback `43/43 rollback-ready`; `git diff --check`; docs validation. |
| Worktree summary | P14.6 docs/board only. No `src/`, tests, package, MCP schema/tool expansion, DeepMemo/TopicMemo/passive-query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | P14.6 standing gate smoke: compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | Not required for docs-only P14.6; latest P14.5 full suite passed `409/409` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P14.6 standing gate smoke passed locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P14.6-compare-rollback-standing-gate-summary`.
- `P14.5-ranking-tie-breaker-parity-tests` is already on `origin/main` at `3afc9c7`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P14.6 docs/status/board updates. It must not modify `src/`, tests, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, or public MCP behavior.
