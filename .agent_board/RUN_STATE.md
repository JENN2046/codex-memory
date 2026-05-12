# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | codex/p1-vcp-memory-core-100-roadmap |
| Mode | Single-Window 4-Agent Compact Autopilot / A4-Sustained Local Autopilot |
| Current task | CM-0039 / CM-0040 complete — scope durability, metadata leakage review fix, and gate strict hardening validated |
| Current area | P9-codex-claude-client-scope / P0-mainline-health |
| Last action | Fixed diary scope metadata durability, stripped internal scope headers before chunk indexing/recall output, added leakage and marker-preservation regressions, restored strict gate to follow `npm test`, and removed Windows `DEP0190` warning path |
| Last validation | `node --test .\tests\scope-filter.test.js` 14/14; `node --test .\tests\mcp-contract.test.js` 4/4; gate CLI targeted tests 4/4; `npm test` 174/174; `npm run gate:mainline:strict` passed health/contract/test/compare/rollback; `git diff --check` passed |
| Worktree summary | Dirty worktree contains validated source changes plus board updates; not committed; push not authorized |
| Mainline assumption | HTTP MCP 7605 is reachable; health remains ok but monitor recovery pattern |
| Legacy rollback assumption | 6005 target may exist, verify via `rollback:mainline:plan` |
| Active-memory suite status | Last recorded baseline varies by board/doc history; current dirty batch must rerun relevant validation before any completion claim |
| Guarded auto-commit allowed | local source+board commit eligible after final Verifier/diff inspection if staging exactly this validated batch; push still requires explicit remote approval |
| Last checkpoint | `93163c0` merge commit is current HEAD; board handoff was stale and is being refreshed |
| Next planned action | Report code review result; optionally run final read-only Verifier before any guarded local commit; do NOT push |

## Notes

Update after meaningful progress, validation, checkpoint, blocker, or guarded local commit.
