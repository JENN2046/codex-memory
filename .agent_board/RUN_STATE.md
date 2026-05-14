# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.6 Safe Sustained Autopilot |
| Current task | CM-0077 / A4.8-safe-project-operator-rail |
| Current area | docs-governance / operator-rail |
| Last local commit | `4ecb78f test: lock controlled write proposal review` |
| Last pushed baseline | `4ecb78f` |
| Last action | Installing A4.8 Safe Project Operator Rail docs/board/policy. |
| Last validation | `git diff --check` passed; docs validation passed. |
| Worktree summary | A4.8 docs/board/policy scope complete; no `src/`, tests, package, `.env`, dependency, MCP schema/tool, SQLite migration, provider call, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | Not required for A4.8 docs-only rail |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after validation and final diff/file-scope inspection; safe push allowed if readiness is ready |
| Last checkpoint | P12.4 controlled write proposal review landed in `origin/main` at `4ecb78f`. |
| Next planned action | Guarded local commit, then push readiness if ahead count requires it. |

## Notes

- Current phase is `A4.8-safe-project-operator-rail`.
- Previous phase `P12.4-MCP-tool-proposal-review` is on `origin/main`.
- Next recommended phase is `P12.5-first-runtime-mutation-tool-behind-explicit-approval`, but runtime mutation still requires explicit approval.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch must not implement runtime mutation or write durable memory.
