# CHECKPOINT.md — codex-memory

## Current Goal

P13.3-SQLite-diary-mapping-dry-run-planning: plan how a future read-only dry-run can map existing SQLite / diary records into VCP-compatible `MemoryRecord` vNext envelopes, while producing mapping previews, missing-field reports, risk reports, and rollback requirements.

## Current Area

P13-object-model / mapping-dry-run-planning

## Current Status

P13 planning, P13.1 fixture schemas, and P13.2 round-trip fixture tests have all landed on `origin/main`. Current HEAD/base before this batch is `82a4463`.

Current decision: keep `validate_memory` internal-only and do not enter public `validate_memory` MCP proposal review. P13.3 is a docs/board planning phase only. It does not implement a runtime mapper, import/export CLI, migration, real data scan, or durable memory write path.

## Completed Work In This Batch

- Added `docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md`.
- Planned future read-only mapping sources: SQLite `memory_records`, diary markdown / DailyNote-compatible records, audit logs, chunk/vector metadata, scope fields, lifecycle fields, and tag metadata when available.
- Defined future dry-run output shape with `status`, `mutated=false`, scanned/mapped/unmapped counts, missing field counts, lifecycle/scope/ref coverage, import/export safety count, risk level, rollback requirement, and next step.
- Defined mapping rules for preserving `memory_id`, scope, lifecycle, audit refs, proposal/tombstone defaults, and dry-run-only `content_ref` / `content_hash`.
- Defined missing-field policy, safety rules, future P13.4-P13.7 implementation sequence, validation plan, and non-goals.
- Updated P13 plan, next phase plan, status, backlog, and board pointers.

## Changed Files

- `docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md`
- `docs/VCP_COMPATIBLE_MEMORY_OBJECT_MODEL_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

## Validation Run

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Both passed.

## Validation Not Run

- `npm test` not required for P13.3 docs/board planning.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No SQLite migration or real data migration.
- No import/export runtime.
- No runtime mapper.
- No real DB/memory write.

## Current Blockers

- None currently.
- Public MCP tool expansion remains blocked until explicit proposal approval.

## Remaining Risks

- Object mapping fixture tests are not added yet; P13.4 should add fixture-only tests before any real scan or CLI.
- Any runtime mapper remains out of scope.
- Any SQLite schema, import/export runtime, real data scan, or data migration remains out of scope.

## Next Safe Action

Inspect the final diff and file scope, then guarded local commit and safe-push readiness if clean.
