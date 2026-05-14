# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0095 / P14.2-DeepMemo-targeted-parity-fixtures |
| Current area | P14-donor-compatibility / DeepMemo fixtures |
| Last local commit | `0bb8db6 docs: inventory p14 donor parity fixtures` |
| Last pushed baseline | `0bb8db6` |
| Last action | Added P14.2 DeepMemo donor parity fixture/test and board/status pointers. |
| Last validation | P14.2 validation passed: `node --test tests\deepmemo-donor-parity-fixture.test.js`; DeepMemo compare `15/15 matched`; DeepMemo rollback `15/15 rollback-safe`; `npm test` `403/403`; `git diff --check`; docs validation. |
| Worktree summary | P14.2 fixture/test/docs/board only. No `src/`, package, MCP schema/tool expansion, DeepMemo/TopicMemo/passive-query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P14.2 full suite passed `403/403` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P14.2 DeepMemo targeted parity fixtures validated locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P14.2-DeepMemo-targeted-parity-fixtures`, validated locally and ready for guarded commit/safe-push readiness.
- Previous phase `P14.1-donor-parity-fixture-inventory` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P14.3-TopicMemo-targeted-parity-fixtures`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P14.2 DeepMemo fixture/test/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, or public MCP behavior.
