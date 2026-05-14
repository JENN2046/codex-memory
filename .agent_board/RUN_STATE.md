# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0085 / P13.1-object-model-fixture-schemas |
| Current area | P13-object-model / fixture-schemas |
| Last local commit | `0286b79 docs: plan vcp compatible memory object model` |
| Last pushed baseline | `0286b79` |
| Last action | Added P13.1 object-model fixture schema and targeted fixture tests. |
| Last validation | P13.1 validation passed: targeted fixture test `13/13`; `npm test` `325/325`; `git diff --check`; `validate-local.ps1 -Area docs`. |
| Worktree summary | P13.1 fixture/tests/docs/board only. No `src/`, package/lockfile, MCP schema/tool, SQLite migration, provider call, hard delete, `.env`, dependency, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | P13.1 full suite passed `325/325` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P13 planning landed in `origin/main` at `0286b79`. |
| Next planned action | Run full validation, guarded commit, then safe-push readiness and safe-push if ready. |

## Notes

- Current phase is `P13.1-object-model-fixture-schemas`.
- Previous phase `P12.6-validate-memory-internal-cli-wrapper` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P13.2-object-model-round-trip-fixture-tests`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P13.1 fixture/tests/docs/status/board updates. It must not modify `src/`, package files, MCP schema/tools, SQLite schema, durable memory, or runtime behavior.
