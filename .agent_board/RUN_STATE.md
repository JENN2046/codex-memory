# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0083 / P12.6-validate-memory-internal-cli-wrapper |
| Current area | P12-controlled-write-tools / validate-memory-internal-cli |
| Last local commit | `6332d30 docs: review validate_memory internal runtime` |
| Last pushed baseline | `6332d30` |
| Last action | Completed P12.6 local internal `validate-memory` CLI wrapper, targeted tests, docs, and board sync. |
| Last validation | CLI `12/12`; runtime `9/9`; fixture `11/11`; MCP contract `7/7`; `npm test` `312/312`; `gate:ci` PASS; strict gate PASS; lifecycle dry-run `mutated=false`; diff check and docs validation passed. |
| Worktree summary | P12.6 allowed files only: CLI, targeted test, package script, docs/status/board. No MCP schema/tool expansion, SQLite migration, provider call, hard delete, `.env`, dependency, or broader mutation runtime. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | passed `312/312` for P12.6 |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | validate_memory internal runtime review landed in `origin/main` at `6332d30`. |
| Next planned action | Inspect diff boundaries, guarded commit, then safe-push readiness and safe-push if ready. |

## Notes

- Current phase is `P12.6-validate-memory-internal-cli-wrapper`.
- Previous phase `P12.5-validate-memory-internal-runtime-review` is on `origin/main`.
- Next recommended phase is `P12.7 public validate_memory MCP proposal review`, or keep internal-only and move to P13.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only the internal CLI wrapper and tests/docs/board/package script. It must not expand MCP tools, alter SQLite schema, hard delete, or implement other mutation tools.
