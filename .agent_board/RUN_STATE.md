# RUN_STATE.md - codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 tests/fixtures/docs |
| Current task | CM-0144 / P20.2b-tagmemo-targeted-fixture-contract-repair |
| Current area | P20 local production hardening readiness blocker repair |
| Last pushed baseline | P20.2a drift review pushed and verified at `cbcbc3ec61a07c62dfa616a224244deadf109382` |
| Latest runtime safety baseline | `41a5630 fix: add validate memory two phase audit` |
| Last action | Repaired the P16.3 TagMemo targeted semantic fixture contract without runtime scoring changes. |
| Last validation | Targeted TagMemo fixture test passed `3/3`; `gate:ci` passed with tests `449/449`; `npm test` passed `464/464`; `git diff --check` and docs validation passed. |
| Worktree summary | P20.2b tests/fixtures/docs/status/board edits only. No `src/`, package, MCP schema/tool, SQLite migration, import/export apply, backup creation, restore, provider call, real memory content read, `.env`, tag, release, deploy, UI, service start, service install, watchdog start, watchdog install, config mutation, or unapproved mutation. |
| Mainline assumption | `origin/main` remains the development base. |
| P20 status | CI-safe readiness restored; P20.3 rollback/backup operations planning can proceed as docs-only. |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Safe-push readiness | pending guarded commit |
| Next planned action | Commit P20.2b repair, then continue to `P20.3-rollback-backup-operations-plan`. |

## Notes

- Runtime scoring was not changed.
- The fixture now distinguishes exact semantic contract from low-margin ordering tail tolerance.
- `gate:ci` remains fixture-only / no-network / no-daemon / no-provider.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- `validate_memory` remains internal-only.
