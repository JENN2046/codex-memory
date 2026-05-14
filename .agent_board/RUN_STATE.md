# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0101 / P15-real-query-quality-gate-planning |
| Current area | P15-query-quality / planning |
| Last local commit | `aa6afe9 docs: summarize p14 donor parity gates` |
| Last pushed baseline | `aa6afe9cb1f9ba768615eba9ae237c716ca53075` |
| Last action | Added P15 real query quality gate plan and board/status pointers. |
| Last validation | P15 planning validation passed: `real-query-suite` fixture recall dry-run `8/8`; `query:quality` fixture recall dry-run `8/8`; `git diff --check`; docs validation. |
| Worktree summary | P15 docs/board only. No `src/`, tests, package, MCP schema/tool expansion, query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | P14.6 standing gate smoke: compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| Query suite status | P15 planning smoke: `real-query-suite` and `query:quality` fixture recall dry-run both `8/8`, `mutated=false`, `providerCalls=0` |
| npm test | Not required for docs-only P15 planning; latest P14.5 full suite passed `409/409` |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P15 planning query baseline and docs validation passed locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P15-real-query-quality-gate-planning`.
- `P14.6-compare-rollback-standing-gate-summary` is already on `origin/main` at `aa6afe9`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P15 planning docs/status/board updates. It must not modify `src/`, tests, package files, MCP schema/tools, SQLite schema, query runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, provider configuration, or public MCP behavior.
