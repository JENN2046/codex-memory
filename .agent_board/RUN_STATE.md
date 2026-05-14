# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 CI-safe gate/docs |
| Current task | CM-0109 / P15.4-fixture-recall-dry-run-standing-gate |
| Current area | P15 query quality standing gate |
| Last local commit | `a60144f test: lock p15 query quality report shape` |
| Last pushed baseline | `a60144f1792ac357b0bb0216fbb5a2e196708d74` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added `gate:ci` fixture recall dry-run standing signal under `checks.queries.detail.fixtureRecallDryRun` and documented P15.4. |
| Last validation | P15.4 validation passed: gate-ci CLI `2/2`; query report tests `21/21`; fixture dry-runs `14/14`; `gate:ci` text PASS; `gate:ci --json` PASS after isolated rerun; `npm test` `420/420`; diff/docs validation passed. |
| Worktree summary | CI-safe gate/docs/board only. No query runtime ranking change, fixture data, package, MCP schema/tool, SQLite migration, provider call, `.env`, tag, release, or deploy. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.4 standing gate completed locally; baseline remains `14/14` fixture-only query validation with fixture recall dry-run standing signal. |
| Guarded auto-commit allowed | eligible after final file-scope check. |
| Next planned action | Create guarded local commit for P15.4 CI-safe gate/docs/board changes. Do not push until readiness. |

## Notes

- Current phase is `P15.4-fixture-recall-dry-run-standing-gate`.
- Decision: do not expand `validate_memory` mutation surface and do not expose public `validate_memory` MCP tool.
- Next recommended phase: `P15.5-real-memory-query-dry-run-planning`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
