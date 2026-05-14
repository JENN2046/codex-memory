# RUN_STATE.md — codex-memory

| Field | Value |
|---|---|
| Workspace root | A:\codex-memory |
| Git repository | yes |
| Branch | main |
| Mode | A4.8 Safe Project Operator Rail |
| Current task | CM-0093 / P14-donor-behavior-parity-gate-planning |
| Current area | P14-donor-compatibility / gate-planning |
| Last local commit | `fe2ee18 docs: finalize p13 closeout wording` |
| Last pushed baseline | `fe2ee18` |
| Last action | Added P14 donor behavior parity gate planning document and board/status pointers. |
| Last validation | P14 planning docs validation passed: `git diff --check`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`. |
| Worktree summary | P14 planning docs/board only. No `src/`, tests, package, MCP schema/tool expansion, DeepMemo/TopicMemo/passive-query runtime change, SQLite migration, import/export or migration behavior change, provider call, `.env`, dependency, real DB/diary read/write, or durable memory write. |
| Mainline assumption | `origin/main` remains the development base; `codex/p1-vcp-memory-core-100-roadmap` is not used as a baseline. |
| Active-memory suite status | Latest pushed strict gate baseline compare `43/43 matched`, rollback `43/43 rollback-ready`. |
| npm test | Last full P13.7 suite passed `401/401`; not rerun for docs-only closeout |
| Profile health | Not run in this batch |
| Guarded auto-commit allowed | eligible after final diff/file-scope inspection |
| Last checkpoint | P14 donor behavior parity gate planning validated locally. |
| Next planned action | Inspect final diff/file scope, then guarded commit and safe-push readiness if clean. |

## Notes

- Current phase is `P14-donor-behavior-parity-gate-planning`, validated locally and ready for guarded commit/safe-push readiness.
- Previous phase `P13.x-closeout-review` is on `origin/main`.
- Current decision: keep `validate_memory` internal-only; do not enter public `validate_memory` MCP proposal review.
- Next recommended phase is `P14.1-donor-parity-fixture-inventory`.
- Public MCP tools remain frozen at `record_memory` / `search_memory` / `memory_overview`.
- This batch may add only P14 planning docs/status/board updates. It must not modify `src/`, tests, package files, MCP schema/tools, SQLite schema, donor runtime behavior, durable memory, import/export or migration behavior, real DB/diary data, or public MCP behavior.
