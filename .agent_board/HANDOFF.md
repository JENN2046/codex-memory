# HANDOFF.md - codex-memory

## Goal

Run P17.3 V8 diagnostic CLI shape gate without changing runtime behavior.

## Workspace

A:\codex-memory

## Branch

`main`

## Worktree

P17.3 fixture/test/docs/status/board edits are local, validated, and uncommitted.

## Current Area

P17 V8 diagnostic CLI shape gate

## Findings

- P15.6 closeout is safe-pushed to `origin/main` at `c8ffe68`.
- P16 is the current true next phase from Git + STATUS + MAINTENANCE_BACKLOG + `.agent_board`.
- P16 planning is validated, committed, safe-pushed, and post-push hash-verified.
- P16.1 inventory is validated, committed, safe-pushed, and post-push hash-verified.
- Dedicated P16 TagMemo fixtures now exist for P16.2 shape tests and P16.3 targeted semantic cases.
- Existing protected surfaces include `TagMemoEngine`, `EPAModule`, `ResidualPyramid`, `SemanticGroupManager`, passive `::TagMemo` / `::Rerank` syntax, and LightMemo `tag_boost` / `core_tags` compatibility.
- Existing coverage lives mainly in `tests/phase-b-passive-recall.test.js`, `tests/phase-b-sync-cache-rerank.test.js`, and `tests/phase-c-lightmemo-boundary.test.js`.
- P16.2 has added synthetic fixture shape tests before runtime tuning.
- P16.2 targeted test (`6/6`), full suite (`426/426`), diff check, docs validation, guarded commit, safe-push, and post-push hash verification passed.
- P16.3 has added targeted synthetic temp-workspace fixtures before runtime tuning.
- P16.3 targeted test (`3/3`), full suite (`429/429`), diff check, and docs validation passed locally.
- P16.3 guarded commit and safe-push completed at `9e26865deed6d91a9fca461659ac743253f59ec1`.
- P16.4 evidence gate has been drafted as docs/status/board only; docs validation passed.
- P16.4 guarded commit and safe-push completed at `afd2a7845892a7aae892ec73440ed15b172af0ba`.
- P16.5 targeted TagMemo tests passed `9/9`; ordering compare passed `4/4 matched`; ordering rollback passed `4/4 rollback-ready`.
- P16.5 full suite (`429/429`), diff check, and docs validation passed.
- P16.5 guarded commit and safe-push completed at `effd73edba04abd5b26c0a4a59dca073db655d2a`.
- P16.x closeout review is drafted as docs/status/board only; docs validation passed.
- P16.x guarded commit and safe-push completed at `dcc15247edd1e1781eeca991e0948734edfea6ee`.
- P17 planning is drafted as docs/status/board only; docs validation passed.
- P17 planning guarded commit and safe-push completed at `a1cdacc57de7f77252d35079184a02de0ab2f07f`.
- P17.1 inventory is drafted as docs/status/board only; docs validation passed.
- P17.1 guarded commit and safe-push completed at `c77e4734d5ca9023be252d1add5d2e1179e5c097`.
- P17.2 fixture shape tests have been drafted for synthetic `v8-diagnose` report shape.
- P17.2 targeted fixture test `5/5`, full suite `434/434`, diff check, and docs validation passed locally.
- P17.2 guarded commit and safe-push completed at `3b7fa68197abc1f75d7fed775da2b569e1ea0d47`.
- P17.3 CLI shape gate has been drafted for synthetic `v8-diagnose` JSON/text/error shell.
- P17.3 targeted CLI gate `5/5`, full suite `439/439`, diff check, and docs validation passed locally.
- `v8-diagnose` is now under CLI-shape evidence in P17.3; this is not authorization for V8 runtime implementation.
- Public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.
- `validate_memory` remains internal-only.

## Changed Files

- `tests/fixtures/v8-diagnostic-cli-gate-v1.json`
- `tests/v8-diagnostic-cli-shape-gate.test.js`
- `docs/P17_V8_DIAGNOSTIC_CLI_SHAPE_GATE.md`
- `docs/P17_ADVANCED_MEMORY_INTELLIGENCE_V8_EVIDENCE_GATE_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `STATUS.md`
- `MAINTENANCE_BACKLOG.md`
- `.agent_board/*`

## Validation

- `node --test tests\v8-diagnostic-cli-shape-gate.test.js` (`5/5`)
- `npm test` (`439/439`)
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Not Done

- No `src/` changes.
- No runtime code changed.
- No package or lockfile changes.
- No MCP schema/tool changes.
- No SQLite migration.
- No import/export apply.
- No real DB or durable memory write.
- No real memory read preview.
- No provider smoke or provider benchmark.
- No V8 implementation.
- No tag, release, deploy, destructive cleanup, or unapproved remote action.

## Next Safe Step

Run final diff/scope review, guarded commit, safe-push, and continue to `P17.4-v8-query-family-fixture-tests`.
