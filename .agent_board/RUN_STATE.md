# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 tests/fixtures/docs |
| Current task | CM-0114 / P16.2-TagMemo-semantic-fixture-shape-tests |
| Current area | P16 TagMemo semantic fixture shape tests |
| Last local commit | P16.1 inventory closeout committed; use `git log --oneline -n 3` for exact HEAD |
| Last pushed baseline | `origin/main` verified after P16.1 safe-push; exact hashes are reported in closeout |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Completed P16.2 fixture shape tests; added synthetic TagMemo semantic fixture and targeted shape test. |
| Last validation | P16.2 validation passed: targeted fixture test `6/6`, `npm test` `426/426`, `git diff --check`, and docs validation. |
| Worktree summary | P16.2 tests/fixtures/docs/board edits only. No `src/`, package, MCP schema/tool, SQLite migration, import/export apply, provider call, real memory read preview, `.env`, tag, release, deploy, or unapproved push. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.6 closeout completed and pushed. |
| P16 status | Planning, P16.1 inventory, and P16.2 fixture shape tests completed and validated locally. |
| Guarded auto-commit allowed | eligible after final diff/scope review |
| Safe-push readiness | not checked for P16.2 yet |
| Next planned action | Run final diff/scope review, then guarded commit/readiness if clean. |

## Notes

- Current true phase was identified from Git + STATUS + MAINTENANCE_BACKLOG as `P16-TagMemo-semantic-association-parity-planning`.
- P15.6 closeout is already safe-pushed at `c8ffe68`.
- Decision: do not implement real-memory query dry-run in P15.6.
- Decision: do not start P16 implementation; current P16 slice is planning/docs/board only.
- Decision: next P16 step is fixture inventory only, not runtime tuning or V8.
- Decision: P16.1 identifies gaps only; P16.2 may add synthetic fixture tests before any runtime tuning.
- Decision: P16.2 locks fixture shape only; no runtime ranking changes or V8 implementation.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
