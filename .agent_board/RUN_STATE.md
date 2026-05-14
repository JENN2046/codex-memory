# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 tests/fixtures/docs only |
| Current task | CM-0107 / P15.2-real-query-quality-fixture-expansion |
| Current area | P15 query quality fixture expansion |
| Last local commit | `d41d9db docs: inventory p15 query quality fixtures` |
| Last pushed baseline | `d41d9db79afa2a92e6cf44a600e2c24e117e161c` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Expanded default real-query fixture coverage from `8/8` to `14/14` with scope, lifecycle, privacy, workspace-boundary, precision, and report-shape cases. |
| Last validation | Targeted query tests passed `19/19`; `real-query-suite` and `query:quality` passed `14/14`; `gate:ci` passed; `npm test` passed `418/418`; diff/docs validation passed. |
| Worktree summary | Tests/fixtures/docs/board only. No runtime, package, MCP schema/tool, SQLite migration, provider call, `.env`, tag, release, or deploy. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.2 fixture expansion completed locally; default suite now passes `14/14` in fixture-only query validation. |
| Guarded auto-commit allowed | eligible after final file-scope check. |
| Next planned action | Guarded local commit. No push without explicit authorization. |

## Notes

- Current phase is `P15.2-real-query-quality-fixture-expansion`.
- Decision: do not expand `validate_memory` mutation surface and do not expose public `validate_memory` MCP tool.
- Next recommended phase: `P15.3-query-quality-report-shape-tests`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
