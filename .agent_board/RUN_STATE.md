# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0079 / P12.5-validate-memory-runtime-fixture-tests |
| Current area | P12-controlled-write-tools / validate-memory-fixture-tests |
| Last local commit | `21f3e03 docs: add P12.5 mutation approval gate` |
| Last pushed baseline | `21f3e03` |
| Last action | Completed validate_memory runtime fixture tests before runtime implementation approval. |
| Last validation | Targeted `validate-memory-runtime-fixture` passed `11/11`; `npm test` passed `291/291`; diff check passed; docs validation passed. |
| Worktree summary | validate_memory fixture/tests/docs scope complete; no `src/`, package, `.env`, dependency, MCP schema/tool, SQLite migration, provider call, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | required for current fixture/test batch |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after docs validation and final diff/file-scope inspection; safe push allowed if readiness is ready |
| Last checkpoint | P12.5 approval gate landed in `origin/main` at `21f3e03`. |
| Next planned action | Guarded commit, push readiness, and safe-push if ready. |

## Notes

- Current phase is `P12.5-validate-memory-runtime-fixture-tests`.
- Previous phase `P12.5-first-runtime-mutation-tool-planning-approval-gate` is on `origin/main`.
- Next recommended phase is explicit approval for a narrow `validate_memory` runtime implementation.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch must not implement runtime mutation or write durable memory.
