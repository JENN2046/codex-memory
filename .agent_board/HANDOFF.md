# HANDOFF.md — codex-memory

## Current State

治理轨道补丁 `48d72f0`、事实源同步 `be7fb94`、scope acceptance 扩展 `3baef74`、以及 scope candidate pushdown `f8dac11` 已推送；当前最新本地工作是 P1 scope recall design：定义 scope 是否继续下推到 recall / audit 语义层的最小设计与风险边界。

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
- npm test: 143/143
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
- Current design focus has been documented: recall audit still lacks explicit scope semantics; [SCOPE_RECALL_AUDIT_DESIGN.md](/A:/codex-memory/docs/SCOPE_RECALL_AUDIT_DESIGN.md) now defines the minimal design and risk boundary before any new runtime patch.
- Current decision: this batch remains docs-only; next runtime candidate is R1 low-risk recall-audit annotation, not a broader overview/dashboard rewrite.
- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- P0.5 dashboard 空库兼容测试修复（仅 `tests/dashboard-cli.test.js`）
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P1: commit/push current scope recall design note if final diff stays scoped
- P2: implement or defer R1 recall-audit annotation based on this design note
- P3: Governance report CLI (proposal/tombstone/supersession/stale metrics)

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
