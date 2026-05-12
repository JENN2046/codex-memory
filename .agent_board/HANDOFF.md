# HANDOFF.md — codex-memory

## Current State

治理轨道补丁 `48d72f0`、事实源同步 `be7fb94`、scope acceptance 扩展 `3baef74`、scope candidate pushdown `f8dac11`、scope recall design `42b9a11`、R1 recall-audit annotation `d519a17`、以及 R2 scoped recall aggregation `7bfd793` 已推送；当前本地工作是 P1 R3：为 `dashboard` / `http-observe` 增加 scoped recall 可见性，但不输出 workspace 明细。

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
- npm test: 145/145
- gate:ci: 119/119 (fixture-only)
- gate:mainline: ok (health 200)
- gate:mainline:strict: ok (`health` + `contract` + `test` + `compare` + `rollback` 全绿)
- profile: bge-m3-local__1024__v1, vectors 205, ready
- dashboard: npm run dashboard

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
- R3 is now implemented and validated locally: `dashboard` / `http-observe` expose scoped recall summary counts plus `scopeMode` / `scopeDimensions` breakdowns, and tests were expanded without exposing raw `workspace_id`.
- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- P0.5 dashboard 空库兼容测试修复（仅 `tests/dashboard-cli.test.js`）
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P1: choose the next post-R3 line, likely governance-report CLI
- P2: evaluate whether active-memory / policy-layer scope needs a separate design track
- P3: Governance report CLI (proposal/tombstone/supersession/stale metrics)

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
