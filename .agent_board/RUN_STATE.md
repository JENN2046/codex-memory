# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 tests/docs only |
| Current task | CM-0108 / P15.3-query-quality-report-shape-tests |
| Current area | P15 query quality report shape tests |
| Last local commit | `a3c9094 test: expand p15 query quality fixtures` |
| Last pushed baseline | `a3c909423951403f4025c30d0f6be8c109ddb434` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added report-shape tests for `real-query-suite`, `query:quality`, `fixtureRecallDryRun`, assertion failure shape, and no fake `hitRate` / `qualityScore`. |
| Last validation | P15.3 validation passed: targeted query tests `21/21`; `real-query-suite` `14/14`; `query:quality` `14/14`; `npm test` `420/420`; `gate:ci` PASS; diff/docs validation passed. |
| Worktree summary | Tests/docs/board only. No runtime, fixture data, package, MCP schema/tool, SQLite migration, provider call, `.env`, tag, release, or deploy. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.3 report shape tests completed locally; baseline remains `14/14` fixture-only query validation. |
| Guarded auto-commit allowed | eligible after final file-scope check. |
| Next planned action | Create guarded local commit for P15.3 tests/docs/board changes. Do not push without explicit authorization. |

## Notes

- Current phase is `P15.3-query-quality-report-shape-tests`.
- Decision: do not expand `validate_memory` mutation surface and do not expose public `validate_memory` MCP tool.
- Next recommended phase: `P15.4-fixture-recall-dry-run-standing-gate`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
