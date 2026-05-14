# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0097 / P14.2-state-reconciliation |
| Current area | P14-donor-compatibility / state reconciliation |
| Last local commit | `4251a27 test: add p14 deepmemo parity fixtures` |
| Last pushed baseline | `4251a27ef484c795e929c1d53a93365c78b72cce` |
| Last action | Reconciled P14.2 state: local HEAD, `origin/main`, and remote `refs/heads/main` all point to `4251a27ef484c795e929c1d53a93365c78b72cce`. |
| Last validation | P14.2 validation evidence is in commit `4251a27`: targeted DeepMemo fixture `2/2`; DeepMemo compare `15/15 matched`; DeepMemo rollback `15/15 rollback-safe`; `npm test` `403/403`; diff/docs validation. P14.2 reconciliation `git diff --check` and docs validation passed. |
| Worktree summary | P14.2 is already tracked and pushed. Current worktree is dirty only because P14.3 untracked files exist: `tests/fixtures/topicmemo-donor-parity-v1.json`, `tests/topicmemo-donor-parity-fixture.test.js`. Do not continue P14.3 during reconciliation. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P14.2 full suite passed `403/403`; no new test run required for reconciliation beyond docs validation |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible for docs/board reconciliation only after final diff/file-scope inspection |
| Last checkpoint | P14.2 true state confirmed as pushed on `main`/`origin/main`/remote. |
| Next planned action | Inspect final reconciliation diff and decide whether to guarded-commit only the docs/board correction. Do not continue P14.3 in this phase. |

## Notes

- Current reconciliation phase is `P14.2-state-reconciliation`.
- `P14.2-DeepMemo-targeted-parity-fixtures` is already on `origin/main` at `4251a27`.
- Previous phase `P14.1-donor-parity-fixture-inventory` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This reconciliation batch may update only docs/board state. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, public MCP behavior, or P14.3 fixture/test content.
