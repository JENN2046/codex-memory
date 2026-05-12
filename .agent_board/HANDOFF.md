# HANDOFF.md — codex-memory

## Current State

P0.5 dashboard 空 store 兼容修复已完成并推送；当前分支收口状态稳定。`01b46f7` 已有维护期 P0.5 tag，当前 `HEAD` / `origin/main` 已推进到 board 校准提交 `8c2836b`，并带有 tag `v0.1.1-scope-boundary-20260508`。

Governance rail calibration completed locally: Worker task contracts and read-only Verifier protocol were added to `AGENTS.md`; `.agent_board/FILE_LOCKS.md` and `.agent_board/RISK_REGISTER.md` were created; board drift was corrected; a small Worker trial updated only `STATUS.md`; first Verifier review returned `NEEDS_FIX` for board cleanup only; cleanup was applied; final read-only Verifier returned `PASS`.

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: `8c2836b`
- Tag: `v0.1.1-scope-boundary-20260508`
- Remote: origin/main synced

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

- Governance rail patch: `AGENTS.md` now defines Commander task contracts and read-only Verifier protocol.
- `.agent_board/FILE_LOCKS.md` and `.agent_board/RISK_REGISTER.md` added.
- Commander -> Worker -> Verifier trial: Worker changed only `STATUS.md`; Verifier found board cleanup gaps; fixes applied.
- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- P0.5 dashboard 空库兼容测试修复（仅 `tests/dashboard-cli.test.js`）
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P0: report governance rail completion; optional guarded local commit only, no push without explicit approval
- P1: Codex/Claude scope acceptance (end-to-end verify scope filter)
- P2: Governance report CLI (proposal/tombstone/supersession/stale metrics)

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
