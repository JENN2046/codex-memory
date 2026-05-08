# HANDOFF.md — codex-memory

## Goal

Phase 1 (P1.0–P1.8) complete. All tasks committed locally on `codex/p1-vcp-memory-core-100-roadmap`. Ready for human acceptance. Next: Phase 2.

## Safe State

All code changes are committed on branch `codex/p1-vcp-memory-core-100-roadmap` (local only, NOT pushed). Origin main at `1628381` is untouched.

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: codex/p1-vcp-memory-core-100-roadmap (local only, not pushed)
- Worktree: P1.0–P1.8 all committed

## Queue Summary

- done: P1.0 plan landing, P1.1 scope acceptance CLI, P1.2 backfill dry-run, P1.3 query suite scaffold, P1.4 schema contract, P1.5 query quality scaffold, P1.6 backfill policy, P1.7 production readiness checklist, P1.8 board closeout
- blocked: none
- remaining: Phase 2 (P2.1–P2.5) — NOT started; requires human acceptance first

## Changed Files

- docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md
- docs/scope-backfill-policy.md
- docs/personal-production-readiness.md
- README.md
- STATUS.md
- package.json
- src/app.js
- src/core/constants.js
- src/core/MemoryWriteService.js
- src/storage/SqliteShadowStore.js
- src/recall/KnowledgeBaseSyncService.js
- src/cli/scope-acceptance.js
- src/cli/scope-backfill-dry-run.js
- src/cli/real-query-suite.js
- src/cli/query-quality-report.js
- tests/scope-acceptance-cli.test.js
- tests/scope-backfill-dry-run.test.js
- tests/real-query-suite.test.js
- tests/query-quality-report.test.js
- tests/mcp-contract.test.js
- benchmarks/real-query-suite/v1.json
- .agent_board/*.md

## Validation Evidence

- npm test: 145/145 passed
- gate:mainline:strict: health 200, contract ok, test ok, compare 39/39, rollback 39/39
- scope:acceptance: status=ok, no leakage
- scope:backfill:dry-run: mutated=false
- real-query-suite: 5 cases, 0 invalid
- query:quality: mutated=false, placeholderCount=5

## Runtime Notes

- MCP mode: HTTP mainline at 127.0.0.1:7605
- Scope fields now stored in SQLite shadow store and preserved across syncs
- New npm scripts: scope:acceptance, scope:backfill:dry-run, real-query-suite, query:quality

## Blockers

- none

## Decisions

- Branch codex/p1-vcp-memory-core-100-roadmap is local only — do not push without explicit authorization
- Phase 1 commits are independent and rebase-safe
- Scope filtering is implemented as post-filter in app.callTool with scope metadata stored in SQLite

## Next Safe Task

Await human acceptance of Phase 1. Do NOT start Phase 2 until acceptance is given. Do NOT push.

## Warnings

- Do not push without explicit approval.
- Do not run real backfill/cleanup/migration without explicit approval.
- Do not modify .env or secrets.
