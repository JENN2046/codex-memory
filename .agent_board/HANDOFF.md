# HANDOFF.md — codex-memory

## Current State

当前本地工作在 `P7` query quality / VCP parity hardening 线。远端 `main` 已同步到 `76b1513 docs: plan workspace scope backfill review`；PR #2 已按 superseded 关闭且未合并，远端分支保留用于追溯。

最新本地批次把 `real-query-suite` 从 placeholder-only 推进到 fixture-only baseline：5 条 case 全部来源于 `benchmarks/default-dataset.json`，`placeholderCount=0`、`fixtureOnlyCount=5`、`realCount=5`。本地提交为 `c425764 feat: replace real query placeholders with fixtures`，尚未 push。本轮不调用 provider，不写真实 SQLite，不导出 broad memory。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: local history includes `c425764 feat: replace real query placeholders with fixtures` plus this board-only cleanup; verify exact tip with `git log --oneline --decorate -n 5`
- Remote baseline: current `origin/main` tip for this maintenance line
- Remote source reviewed: `origin/codex/p1-vcp-memory-core-100-roadmap`
- Remote status: verify with `git status -sb` before relying on the handoff

## Key Baseline

- compare: 43/43 matched, 0/0 core/extended
- rollback: 43/43 rollback-ready, 0/0
- npm test: 181/181
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
- `e1883e6`, `cf660d0`, and `8b2d56b` pushed to `origin/main`.
- PR #2 closed as superseded; branch `codex/p1-vcp-memory-core-100-roadmap` retained.
- `scope:backfill:dry-run` reports `442` records missing `workspace_id`; docs-only review plan added to avoid unsafe automatic backfill.
- `benchmarks/real-query-suite/v1.json` now uses sanitized fixture-only cases from `benchmarks/default-dataset.json` instead of placeholder notes.
- `real-query-suite` / `query:quality` now report `fixtureOnlyCount` and `realCount`; default suite is `5` real fixture-only cases and `0` placeholders.
- Targeted query tests passed `11/11`; full `npm test` passed `181/181`; `git diff --check` passed.
- Read-only review found only stale board/handoff wording after `c425764`; this cleanup updates handoff state and removes duplicate changed-file noise.

## Next

- P1: push `c425764` plus the board cleanup commit only with explicit remote authorization.
- P2: add a fixture assertion runner that checks `mustContain` / `mustNotContain` against the sanitized fixture text.
- P3: any true `workspace_id` backfill requires explicit approval after a reviewed mapping proposal.

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
- real `workspace_id` backfill / SQL update / broad memory export
