# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 compare/rollback semantic evidence gate |
| Current task | CM-0117 / P16.5-compare-rollback-semantic-gate |
| Current area | P16 TagMemo compare/rollback semantic evidence gate |
| Last local commit | P16.4 semantic ranking evidence gate committed and safe-pushed at `afd2a78` |
| Last pushed baseline | local `HEAD`, local `origin/main`, and remote `refs/heads/main` verified at `afd2a7845892a7aae892ec73440ed15b172af0ba` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Started P16.5 compare/rollback semantic gate after P16.4 safe-push. |
| Last validation | P16.5 targeted TagMemo tests passed `9/9`; ordering compare passed `4/4 matched`; ordering rollback passed `4/4 rollback-ready`; `npm test` passed `429/429`; diff/docs validation passed. |
| Worktree summary | P16.5 docs/status/board edits only. No `src/`, tests, package, MCP schema/tool, SQLite migration, import/export apply, provider call, real memory read preview, `.env`, tag, release, deploy, or unapproved push. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.6 closeout completed and pushed. |
| P16 status | Planning through P16.4 completed and pushed; P16.5 compare/rollback semantic gate validated locally. |
| Guarded auto-commit allowed | eligible after final diff/scope review |
| Safe-push readiness | not checked for P16.5 yet |
| Next planned action | Run final diff/scope review, guarded commit, and safe-push readiness. |

## Notes

- Current true phase was identified from Git + STATUS + MAINTENANCE_BACKLOG as `P16-TagMemo-semantic-association-parity-planning`.
- P15.6 closeout is already safe-pushed at `c8ffe68`.
- Decision: do not implement real-memory query dry-run in P15.6.
- Decision: do not start P16 implementation; current P16 slice is planning/docs/board only.
- Decision: next P16 step is fixture inventory only, not runtime tuning or V8.
- Decision: P16.1 identifies gaps only; P16.2 may add synthetic fixture tests before any runtime tuning.
- Decision: P16.2 locks fixture shape only; no runtime ranking changes or V8 implementation.
- Decision: P16.3 adds targeted temp-workspace semantic fixtures only; no runtime ranking changes.
- Decision: P16.4 is evidence/docs only; runtime tuning remains deferred until later explicit phase evidence and approval.
- Decision: P16.5 uses compare/rollback ordering evidence with scope limits; donor ordering compatibility is not passive TagMemo live-quality proof.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
