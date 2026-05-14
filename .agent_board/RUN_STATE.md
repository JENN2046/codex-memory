# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs planning |
| Current task | CM-0120 / P17.1-v8-diagnostic-surface-inventory |
| Current area | P17 V8 diagnostic surface inventory |
| Last local commit | P17 planning committed and safe-pushed at `a1cdacc` |
| Last pushed baseline | local `HEAD`, local `origin/main`, and remote `refs/heads/main` verified at `a1cdacc57de7f77252d35079184a02de0ab2f07f` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Started P17.1 V8 diagnostic surface inventory after P17 planning safe-push. |
| Last validation | P17.1 docs validation passed: `git diff --check`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`. |
| Worktree summary | P17.1 inventory docs/status/board edits only. No `src/`, tests, package, MCP schema/tool, SQLite migration, import/export apply, provider call, real memory read preview, `.env`, tag, release, deploy, or unapproved push. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.6 closeout completed and pushed. |
| P16 status | Planning through P16.x completed and pushed. |
| P17 status | Planning completed and pushed; P17.1 inventory validated locally. |
| Guarded auto-commit allowed | eligible after final diff/scope review |
| Safe-push readiness | not checked for P17.1 yet |
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
- Decision: P16.x may mark P16 fixture-backed and gate-checked, but P17 must begin with planning/evidence only.
- Decision: P17 planning defines evidence gates only; no V8 implementation, runtime tuning, provider call, MCP expansion, migration, or real memory preview.
- Decision: P17.1 inventory is docs-only; it must not run `v8-diagnose` or add tests yet.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
