# HANDOFF.md — codex-memory

## Current State

治理轨道补丁 `48d72f0`、事实源同步 `be7fb94`、scope acceptance 扩展 `3baef74`、scope candidate pushdown `f8dac11`、scope recall design `42b9a11`、R1 recall-audit annotation `d519a17`、R2 scoped recall aggregation `7bfd793`、R3 observability surface `f37a91a`、以及 `governance:report` 收口 `c592026` 已推送；当前本地工作是 P10 + P8-lite：把 governance summary 只读接到 `dashboard` / `http-observe`，并加上治理提示与状态分级。

Verifier rail 已完成并已随治理轨道推上远端：`AGENTS.md` 已补充 Worker task contract 与 read-only Verifier protocol；`.agent_board/FILE_LOCKS.md` / `.agent_board/RISK_REGISTER.md` 已建立；Commander -> Worker -> Verifier 试跑完成并通过最终 Verifier PASS。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: current local `main` tip（use `git log --oneline --decorate -n 1` for the exact hash）
- Remote baseline: current `origin/main` tip for this maintenance line
- Remote tag baseline: `v0.1.1-scope-boundary-20260508`
- Remote status: verify with `git status -sb` before relying on the handoff

## Key Baseline

- compare: 43/43 matched, 0/0 core/extended
- rollback: 43/43 rollback-ready, 0/0
- npm test: 148/148
- gate:ci: 119/119 (fixture-only)
- gate:mainline: ok (health 200)
- gate:mainline:strict: ok (`health` + `contract` + `test` + `compare` + `rollback` 全绿)
- profile: bge-m3-local__1024__v1, vectors 205, ready
- dashboard: npm run dashboard
- governance snapshot: `dashboard` / `observe:http` 现在都会带 `governance.status`、`reviewLevel`、counts、hints

## Recent Work

- Governance rail patch committed locally as `48d72f0`.
- Docs-governance fact sync pushed as `be7fb94`.
- `AGENTS.md` now defines Commander task contracts and read-only Verifier protocol.
- `.agent_board/FILE_LOCKS.md` and `.agent_board/RISK_REGISTER.md` added.
- Commander -> Worker -> Verifier trial: Worker changed only `STATUS.md`; first Verifier found board cleanup gaps; final Verifier PASS.
- Scope acceptance now covers `workspace_id` / `client_id` end-to-end positive and strict negative cases.
- Scope enforcement batch completed locally: candidate selection is narrowed by `project_id` / `workspace_id` / `client_id` / `visibility` before ranking, while post-filter remains as a fallback.
- New regression coverage proves `limit=1` search still returns the in-scope record when higher-scoring off-scope records exceed the candidate pool.
- R1 is now implemented: recall audit records `scopeApplied` / `scopeMode` / `scopeDimensions` / `scopeStrict` plus low-risk scope fields, while `workspace_id` remains presence-only.
- `SCOPE_RECALL_AUDIT_DESIGN.md` now serves as the boundary doc for R2/R3 follow-ups, not just a proposal for R1.
- R2 is now implemented: `memory_overview.recall.summary.scope` aggregates scoped recall count, strict count, latest scoped hit, and low-risk `mode/dimension/project/client/visibility` breakdowns.
- Current boundary remains intact: no workspace breakdown and no raw `workspace_id` exposure in overview summary.
- R3 is now implemented and pushed: `dashboard` / `http-observe` expose scoped recall summary counts plus `scopeMode` / `scopeDimensions` breakdowns, and tests were expanded without exposing raw `workspace_id`.
- `governance:report` is now hardened and pushed: it resolves DB path through `createConfig`, opens SQLite read-only, correctly binds stale-threshold timestamps, and has dedicated CLI tests for governance metrics plus missing-DB behavior.
- Current local batch extends that snapshot into `dashboard` / `http-observe`, adds read-only governance checks/recommendations/hints, keeps the no-write / no raw `workspace_id` boundary intact, and has passed `dashboard 4/4`, `http-observe 2/2`, `governance-report 3/3`, `npm test 148/148`, and `gate:mainline:strict`.
- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- P0.5 dashboard 空库兼容测试修复（仅 `tests/dashboard-cli.test.js`）
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P1: run final batch validation (`npm test`, `npm run gate:mainline:strict`, `git diff --check`) and inspect diff
- P2: guarded commit + push the governance-surface batch if validation stays green
- P3: after push, decide whether to move into policy-layer proposal/scope design or keep expanding read-only observability

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
