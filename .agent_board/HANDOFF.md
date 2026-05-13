# HANDOFF.md — codex-memory

## Current State

当前本地工作在 `P10` observability admin 线。远端 `main` 已同步到 `bcaf440 docs: record observability schema commit state`。PR #2 已按 superseded 关闭且未合并，远端分支保留用于追溯。

最新本地批次 `S-010` 给 README / VALIDATION 补 dashboard/http-observe schema contract 摘要：文档现在明确 `summary`、`governance`、`audits`、`scope`、`logs` 的只读观测边界。本轮不改运行时代码，不写真实 SQLite，不调用 provider。

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
- gate:ci: compare 43/43, rollback 43/43, query assertions 8/8, CI-safe tests 171/171 (fixture-only)
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
- S-005 added `checks.queries` to `gate:ci`, reusing the same fixture assertion runner and exposing `caseCount/assertedCount/passedCount/failedCount` in JSON.
- `node --test tests\gate-ci-cli.test.js` passed `2/2`; `npm run gate:ci -- --json` passed with query assertions `8/8` and CI-safe tests `171/171`; `npm test` passed `184/184`.
- S-006 documented `gate:ci` fixture-only JSON fields in README / VALIDATION and added schema snapshot assertions to `tests/gate-ci-cli.test.js`.
- Current S-006 validation passed: targeted gate-ci test `2/2`; `gate:ci -- --json` ok with compare `43/43`, rollback `43/43`, query assertions `8/8`, CI-safe tests `171/171`; `npm test` `184/184`; `git diff --check`.
- S-006 pushed to `origin/main` at `2b50545`.
- S-007 added `review` to `governance:report` and updated README/VALIDATION/schema tests.
- Current S-007 validation passed: affected dashboard/http-observe/governance tests `9/9`; `npm run governance:report -- --json` ok with local `review.status=ok`, `reviewLevel=nominal`; `npm test` `184/184`; `gate:ci --json` ok with compare/rollback `43/43` and query assertions `8/8`; `git diff --check` passed.
- S-008 added governance output sample and troubleshooting notes to README / VALIDATION.
- Current S-008 docs validation passed: `git diff --check`; `scripts/validate-local.ps1 -Area docs`.
- S-008 docs-only commit created: `26c919f docs: add governance report troubleshooting note`.
- S-008/S-007 pushed to `origin/main`; current remote baseline is `1db0317`.
- S-009 added dashboard/http-observe detailed schema snapshots.
- Current S-009 validation passed: `node --test tests\dashboard-cli.test.js tests\http-observe-cli.test.js` `6/6`; `npm test` `184/184`; `gate:ci --json` ok with compare/rollback `43/43` and query assertions `8/8`; `git diff --check` passed.
- S-009 local commit created: `e41fc46 test: lock observability schemas`.
- S-009 pushed to `origin/main`; current remote baseline is `bcaf440`.
- S-010 documented dashboard/http-observe schema contract boundaries in README / VALIDATION.
- Current S-010 docs validation passed: `git diff --check`; `scripts/validate-local.ps1 -Area docs`.
- S-010 primary docs commit created: `e466b0e docs: summarize observability schema contract`.

## Next

- P1: push local S-010 commits only after explicit remote authorization.
- P2: otherwise stop at this stable docs checkpoint.
- P3: any true `workspace_id` backfill requires explicit approval after a reviewed mapping proposal.

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
- real `workspace_id` backfill / SQL update / broad memory export
