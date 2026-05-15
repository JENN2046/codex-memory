# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 read-only review + docs/board |
| Current task | CM-0143 / P20.2a-gate-ci-tagmemo-semantic-drift-review |
| Current area | P20 local production hardening readiness blocker review |
| Last pushed baseline | P20.2 health/readiness evidence pushed and verified at `3ee33aa452bd6108ab472a42cd1a3c2cdd3ec0c3` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Reviewed the P16.3 TagMemo semantic ordering drift blocking `gate:ci` and documented the repair boundary. |
| Last validation | `node --test tests\tagmemo-targeted-semantic-fixture.test.js` failed `2/3`; repeated targeted loop reproduced the failure; inline score inspection completed; `git diff --check` and docs validation passed. |
| Worktree summary | P20.2a docs/review/status/board edits only. No `src/`, tests, fixtures, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | P20.2a review completed locally; `gate:ci` remains blocked until P20.2b repairs or narrows the P16.3 fixture contract. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P20.2a review, then continue to `P20.2b-tagmemo-targeted-fixture-contract-repair`. |

## Notes

- Standalone P16.3 targeted test currently fails on `tag-title-body-evidence-order`.
- Wider `gate:ci` previously also surfaced `group-tag-interleaves-semantic-buckets`.
- Score inspection suggests low-margin exact ordering assertions are part of the blocker.
- P20.2a did not change runtime, tests, or fixtures.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
