# HANDOFF.md — codex-memory

## Current State

治理轨道补丁已在本地提交为 `48d72f0`，当前分支相对 `origin/main` 为 `ahead 1`。远端仍停在 `8c2836b`，对应 tag `v0.1.1-scope-boundary-20260508`。

Verifier rail 已完成本地落地：`AGENTS.md` 已补充 Worker task contract 与 read-only Verifier protocol；`.agent_board/FILE_LOCKS.md` / `.agent_board/RISK_REGISTER.md` 已建立；Commander -> Worker -> Verifier 试跑完成并通过最终 Verifier PASS。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: `48d72f0`
- Remote baseline: `8c2836b`
- Remote tag baseline: `v0.1.1-scope-boundary-20260508`
- Remote status: local branch `ahead 1`

## Key Baseline

- compare: 43/43 matched, 0/0 core/extended
- rollback: 43/43 rollback-ready, 0/0
- npm test: 140/140
- gate:ci: 119/119 (fixture-only)
- gate:mainline: ok (health 200)
- gate:mainline:strict: ok (`health` + `contract` + `test` + `compare` + `rollback` 全绿)
- profile: bge-m3-local__1024__v1, vectors 205, ready
- dashboard: npm run dashboard

## Recent Work

- Governance rail patch committed locally as `48d72f0`.
- `AGENTS.md` now defines Commander task contracts and read-only Verifier protocol.
- `.agent_board/FILE_LOCKS.md` and `.agent_board/RISK_REGISTER.md` added.
- Commander -> Worker -> Verifier trial: Worker changed only `STATUS.md`; first Verifier found board cleanup gaps; final Verifier PASS.
- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- P0.5 dashboard 空库兼容测试修复（仅 `tests/dashboard-cli.test.js`）
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P0: current facts synced into STATUS / backlog / board surfaces; next safe implementation target is scope acceptance
- P1: Codex/Claude scope acceptance (end-to-end verify scope filter across `client_id / workspace_id / project_id / visibility`)
- P2: Governance report CLI (proposal/tombstone/supersession/stale metrics)

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
