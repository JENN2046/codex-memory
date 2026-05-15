# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 docs/evidence + board |
| Current task | CM-0142 / P20.2-health-readiness-dry-run-evidence |
| Current area | P20 local production hardening readiness evidence |
| Last pushed baseline | P20.1 startup/watchdog inventory pushed and verified at `e56bc2a182302e86f9cf8c79f642e0e7badccc99` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Captured P20.2 CI-safe readiness evidence and identified a P16.3 TagMemo semantic ordering drift blocking `gate:ci`. |
| Last validation | `npm run gate:ci -- --json` failed with tests `448/449`; manual CI-safe test batch reproduced the same single failure; `git diff --check` and docs validation passed. |
| Worktree summary | P20.2 docs/evidence/status/board edits only. No `src/`, tests, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | P20.2 evidence captured; readiness is blocked until `gate:ci` is green or the blocker is explicitly accepted. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P20.2 evidence, then continue to `P20.2a-gate-ci-tagmemo-semantic-drift-review`. |

## Notes

- `gate:ci` compare, rollback, query, policy, lifecycle, and docs checks are green.
- The red signal is `tests/tagmemo-targeted-semantic-fixture.test.js`, case `group-tag-interleaves-semantic-buckets`.
- P20.2 did not run `observe:http` because live runtime/log/audit observation is deferred until readiness is green or explicitly scoped.
- P20.2 did not run `rollback:mainline:plan` because external config / legacy target probing is deferred until readiness is green or explicitly scoped.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
