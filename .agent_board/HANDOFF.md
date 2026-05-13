# HANDOFF.md — codex-memory

## Current State

当前本地工作在 `P7` query quality / VCP parity hardening 线。远端 `main` 已同步到 `055d749 docs: clean query suite handoff state`；PR #2 已按 superseded 关闭且未合并，远端分支保留用于追溯。

最新本地批次 `S-004` 把 `real-query-suite` 从 5 条 fixture assertion case 扩到 8 条，覆盖 `benchmarks/default-dataset.json` 的全部 query；当前 `placeholderCount=0`、`fixtureOnlyCount=8`、`realCount=8`、`assertedCount=8`、`passedCount=8`、`failedCount=0`。本轮不调用 provider，不写真实 SQLite，不导出 broad memory。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: verify exact tip with `git log --oneline --decorate -n 5`
- Remote baseline: current `origin/main` tip for this maintenance line
- Remote source reviewed: `origin/codex/p1-vcp-memory-core-100-roadmap`
- Remote status: verify with `git status -sb` before relying on the handoff

## Key Baseline

- compare: 43/43 matched, 0/0 core/extended
- rollback: 43/43 rollback-ready, 0/0
- npm test: 184/184
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
- Previous fixture-only baseline targeted query tests passed `11/11`; full `npm test` passed `181/181`; `git diff --check` passed.
- Read-only review found only stale board/handoff wording after `c425764`; this cleanup updates handoff state and removes duplicate changed-file noise.
- Added shared fixture assertion runner for `mustContain` / `mustNotContain` and reused it from `real-query-suite` and `query:quality`.
- Default query suite now reports `assertedCount=5`, `passedCount=5`, `failedCount=0`; synthetic drift tests confirm bad fixtures exit non-zero with `assertionFailures`.
- Targeted query tests passed `13/13`; full `npm test` passed `183/183`.
- S-004 added q5/q6/q7 fixture cases for `rerank_providers`, `embedding_providers`, and `diary_vectors`; provider smoke is now aligned as `rq-008`.
- Default query suite now covers all 8 default dataset queries; targeted query tests passed `14/14`; full `npm test` passed `184/184`.

## Next

- P1: commit and push S-004 to `origin/main` as explicitly authorized by the user.
- P2: wire the query assertion runner into a broader fixture-only gate.
- P3: any true `workspace_id` backfill requires explicit approval after a reviewed mapping proposal.

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
- real `workspace_id` backfill / SQL update / broad memory export
