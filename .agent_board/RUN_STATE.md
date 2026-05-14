# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0098 / P14.4-error-meta-parity-tests |
| Current area | P14-donor-compatibility / error-meta fixtures |
| Last local commit | `3c7d51b test: add p14 topicmemo parity fixtures` |
| Last pushed baseline | `3c7d51b469bf44aaccdb11193893a62353a91590` |
| Last action | Added P14.4 shared donor error/meta parity fixture/test and board/status pointers. |
| Last validation | P14.4 validation passed: targeted fixture `2/2`; CLI regression `17/17`; shared compare gate `31/31 matched`; shared rollback gate `31/31 rollback-safe`; `npm test` `407/407`; `git diff --check`; docs validation. |
| Worktree summary | P14.4 fixture/test/docs/board only. No `src/`, package, MCP schema/tool expansion, DeepMemo/TopicMemo/passive-query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P14.4 full suite passed `407/407` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P14.4 error/meta parity fixtures validated locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P14.4-error-meta-parity-tests`.
- `P14.3-TopicMemo-targeted-parity-fixtures` is already on `origin/main` at `3c7d51b`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P14.4 error/meta fixture/test/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, or public MCP behavior.
