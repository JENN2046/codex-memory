# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/planning only |
| Current task | CM-0110 / P15.5-real-memory-query-dry-run-planning |
| Current area | P15 real-memory query dry-run planning |
| Last local commit | `4aa0356 feat: gate fixture recall dry run in ci` |
| Last pushed baseline | `4aa03563e8e132a1d00f4ba2a8002778af051b77` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Added P15.5 planning for future redacted, opt-in, read-only real-memory query dry-run boundaries. |
| Last validation | P15.5 docs-only validation passed: `git diff --check`; `validate-local.ps1 -Area docs`. |
| Worktree summary | Docs/board planning only. No `src/`, tests, fixture data, package, MCP schema/tool, SQLite migration, import/export apply, provider call, real memory read preview, `.env`, tag, release, deploy, or push. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| P14 status | P14.2-P14.6 are present on `origin/main`. |
| P15 status | P15.5 planning completed locally; P15.4 standing gate is on `origin/main`. |
| Guarded auto-commit allowed | eligible after final file-scope check. |
| Next planned action | Create guarded local commit for P15.5 docs/board changes. Do not push until readiness. |

## Notes

- Current phase is `P15.5-real-memory-query-dry-run-planning`.
- Decision: do not implement real-memory query dry-run in P15.5.
- Decision: do not expand `validate_memory` mutation surface and do not expose public `validate_memory` MCP tool.
- Next recommended phase: `P15.6-query-quality-closeout-review`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
