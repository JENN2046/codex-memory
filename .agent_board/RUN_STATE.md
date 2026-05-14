# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0096 / P14.3-TopicMemo-targeted-parity-fixtures |
| Current area | P14-donor-compatibility / TopicMemo fixtures |
| Last local commit | `829817c docs: reconcile p14 deepmemo parity state` |
| Last pushed baseline | `829817c06852a17500100142f4c35823d839d519` |
| Last action | Added P14.3 TopicMemo donor parity fixture/test and board/status pointers. |
| Last validation | P14.3 validation passed: `node --test tests\topicmemo-donor-parity-fixture.test.js` `2/2`; TopicMemo compare `13/13 matched`; TopicMemo rollback `13/13 rollback-safe`; `npm test` `405/405`; `git diff --check`; docs validation. |
| Worktree summary | P14.3 fixture/test/docs/board only. No `src/`, package, MCP schema/tool expansion, DeepMemo/TopicMemo/passive-query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P14.3 full suite passed `405/405` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after validation and final diff/file-scope inspection |
| Last checkpoint | P14.3 TopicMemo targeted parity fixtures validated locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P14.3-TopicMemo-targeted-parity-fixtures`.
- `P14.2-DeepMemo-targeted-parity-fixtures` is already on `origin/main` at `4251a27`.
- `P14.2-state-reconciliation` is already on `origin/main` at `829817c`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P14.3 TopicMemo fixture/test/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, or public MCP behavior.
