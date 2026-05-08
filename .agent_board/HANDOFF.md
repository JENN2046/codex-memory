# HANDOFF.md — codex-memory

## Current State

P0 + P0.1 可靠性修复完成，等待 push 授权。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main (ahead of origin/main by 2)
- HEAD: `98d0f04`
- Base: `cb3bac9` (origin/main)

## P0/P0.1 Summary

**P0 (7dbed69)** — applyScopeFilter async fix, mapRow governance columns, MCP schema scope, ensureReady migration, governance-report params

**P0.1 (98d0f04)** — restore additionalProperties:false, upsertRecord 14 governance/scope columns, nullable project_id/workspace_id/client_id, upsertRecord write-through tests

## Key Baseline

- npm test: 141/141
- gate:mainline:strict: contract 5/5, compare 43/43, rollback 43/43
- gate:ci: 119/119 (fixture-only)
- profile: ready (vectors 205)
- dashboard: `npm run dashboard`

## Changed Files (P0+P0.1)

- src/app.js — applyScopeFilter await + camelCase keys
- src/cli/governance-report.js — params, totalRecords, schemaStatus
- src/core/constants.js — additionalProperties:false + scope schema
- src/storage/SqliteShadowStore.js — upsertRecord 14 cols + ensureColumn + mapRow
- tests/governance-schema.test.js — schema migration + upsertRecord + MCP contract
- tests/scope-filter.test.js — scope filter backward compat + filtering

## Next

- Push requires Commander authorization
- P2 governance productization pending
