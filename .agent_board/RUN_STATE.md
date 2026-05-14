# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0099 / P14.5-ranking-tie-breaker-parity-tests |
| Current area | P14-donor-compatibility / ranking fixtures |
| Last local commit | `d913b71 test: add p14 error meta parity fixtures` |
| Last pushed baseline | `d913b711d2693246773aafabc3e0d9d5e0b435cd` |
| Last action | Added P14.5 ranking/tie-breaker parity fixture/test and board/status pointers. |
| Last validation | P14.5 validation passed: targeted fixture `2/2`; ordering compare gate `4/4 matched`; ordering rollback gate `4/4 rollback-safe`; `npm test` `409/409`; `git diff --check`; docs validation. |
| Worktree summary | P14.5 fixture/test/docs/board only. No `src/`, package, MCP schema/tool expansion, DeepMemo/TopicMemo/passive-query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P14.5 full suite passed `409/409` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P14.5 ranking/tie-breaker parity fixtures validated locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P14.5-ranking-tie-breaker-parity-tests`.
- `P14.4-error-meta-parity-tests` is already on `origin/main` at `d913b71`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P14.5 ranking/tie-breaker fixture/test/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, or public MCP behavior.
