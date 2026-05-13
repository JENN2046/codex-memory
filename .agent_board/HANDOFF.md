# HANDOFF.md — codex-memory

## Current State

当前本地工作是已提交的 `P9` selective integration：`e1883e6 feat: integrate scoped memory runtime tools` 从 `origin/codex/p1-vcp-memory-core-100-roadmap` 只取 scope/runtime/query 相关实现、CLI、tests、benchmark fixture 和 `docs/scope-backfill-policy.md`，明确排除陈旧状态文档和远端 `.agent_board`。

本批次已完成本地修复、验证与本地提交：恢复 schema enum 约束，修正 `scope-backfill-dry-run` 对仅缺 `workspace_id` 的记录统计，增强 `scope-acceptance` 的四维 strict isolation 检查，并保留 `MemoryWriteService` 的 camelCase 兼容。未 push。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: current local `main` tip; integration commit is `e1883e6 feat: integrate scoped memory runtime tools`
- Remote baseline: current `origin/main` tip for this maintenance line
- Remote source reviewed: `origin/codex/p1-vcp-memory-core-100-roadmap`
- Remote status: verify with `git status -sb` before relying on the handoff

## Key Baseline

- compare: 43/43 matched, 0/0 core/extended
- rollback: 43/43 rollback-ready, 0/0
- npm test: 180/180
- gate:ci: 119/119 (fixture-only)
- gate:mainline:strict: ok (`health` + `contract` + `test` + `compare` + `rollback` 全绿)
- scope acceptance: ok for `project_id` / `workspace_id` / `client_id` / `visibility`
- profile: bge-m3-local__1024__v1, vectors 205, ready
- dashboard: npm run dashboard
- governance snapshot: `dashboard` / `observe:http` 现在都会带 `governance.status`、`reviewLevel`、counts、hints
- policy-layer note: `docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md`
- soft read-policy preflight: `docs/SOFT_READ_POLICY_PREFLIGHT.md`
- named autopilot note: `docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md`

## Recent Work

- Selected integration restored local changes in package scripts, `src/app.js`, mainline/gate/query/scope CLIs, core scope constants/write service, recall/storage services, scope/query tests, and `benchmarks/real-query-suite/v1.json`.
- Stale remote docs were not imported: `README.md`, `STATUS.md`, `PHASE_NAVIGATION.md`, `MAINTENANCE_BACKLOG.md`, and remote `.agent_board` remain excluded.
- `src/core/constants.js` now keeps strict enum values for `client_id` and `visibility` in MCP schemas.
- `src/cli/scope-backfill-dry-run.js` now counts records missing only `workspace_id` and marks `workspace_id` as `<manual-review-required>`.
- `src/cli/scope-acceptance.js` now validates four scope dimensions and detects leaks by memory id.
- `src/core/MemoryWriteService.js` accepts existing camelCase scope aliases to avoid breaking internal call sites.
- Targeted tests passed 44/44; full `npm test` passed 180/180; strict gate passed; scope acceptance passed.
- Guarded local commit `e1883e6` created; push remains unauthorized.

## Next

- P1: push remains separate explicit authorization and is not implied by local commit approval.

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
