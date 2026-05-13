# HANDOFF.md — codex-memory

## Goal

Resume after `P11.8-lifecycle-read-policy-runtime-flag-implementation` in `A:\codex-memory`.

## Workspace

- Workspace: A:\codex-memory
- Branch: `main`
- Base: `origin/main` / `63482b4`
- Remote boundary: no push / tag / release / deploy without explicit authorization

## Current Area

P11-memory-lifecycle-core / lifecycle-read-policy-runtime

## Completed In Current Batch

- Implemented `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY`, default `false`.
- Preserved `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` default behavior.
- Added read-only `SqliteShadowStore.getRecordsLifecycleStatusMap(memoryIds)`.
- Added runtime post-filter for ordinary `search_memory` when lifecycle policy is enabled.
- Kept `active` / `stale`; filtered `proposal` / `rejected` / `superseded` / `tombstoned`.
- Counted visible stale results and hidden lifecycle candidates.
- Added missing lifecycle column fail-safe behavior for enabled mode.
- Added low-risk read-policy audit summary without raw `workspace_id`.
- Added runtime tests and updated docs/board.

## Changed Files

- `src/config/createConfig.js`
- `src/app.js`
- `src/storage/SqliteShadowStore.js`
- `src/recall/RecallAuditService.js`
- `tests/lifecycle-read-policy-runtime.test.js`
- `docs/MEMORY_LIFECYCLE_READ_POLICY_RUNTIME_IMPLEMENTATION_PLAN.md`
- `docs/MEMORY_LIFECYCLE_READ_POLICY_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/*`

## Validation

- `node --test tests\lifecycle-read-policy-runtime.test.js`：passed `6/6`
- `node --test tests\lifecycle-read-policy-runtime-fixture.test.js`：passed `10/10`
- `node --test tests\mcp-contract.test.js`：passed `7/7`
- `npm test`：passed `233/233` after `npm run start:http:ensure`
- `npm run gate:ci`：passed
- `npm run gate:mainline:strict`：passed
- `npm run scope:acceptance -- --json`：passed
- `npm run lifecycle:sqlite:dry-run -- --json`：passed, `mutated=false`

## MCP Mode

- Public MCP tools remain `record_memory` / `search_memory` / `memory_overview`.
- No new MCP public tools were added.

## Audit / Recall Impact

- Default-off recall remains backward-compatible.
- Enabled lifecycle policy adds ordinary recall filtering and a `read-policy` audit summary.
- Audit summary includes low-risk policy fields and `scopeWorkspacePresent`.
- Audit summary does not include raw `workspace_id`.

## Not Done

- No SQLite migration or automatic `ALTER TABLE`.
- No admin/audit mode.
- No `include_superseded`.
- No provider smoke / benchmark.
- No `rebuild-profile --confirm`.
- No push / tag / release / deploy.

## Remaining Risks

- Future lifecycle SQL pushdown and default-on policy are separate phases.
- If HTTP health is down, strict gate can fail before implementation-specific checks; use `npm run start:http:ensure` before strict gate validation.

## Next Safe Step

Final diff/docs validation, then stop without push. Next recommended phase after commit/push authorization is
`P11.9-lifecycle-policy-gate-ci-summary`.
