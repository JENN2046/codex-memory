# HANDOFF.md — codex-memory

## Current State

P0.5 dashboard 空 store 兼容修复已完成并推送；当前分支收口状态稳定，等待是否对 `01b46f7` 进行 tag 决策。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: `01b46f7`
- Tag: （当前无新 tag；`P0.5` 可考虑新增）
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

- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- P0.5 dashboard 空库兼容测试修复（仅 `tests/dashboard-cli.test.js`）
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P1: Codex/Claude scope acceptance (end-to-end verify scope filter)
- P2: Governance report CLI (proposal/tombstone/supersession/stale metrics)
- 是否对 `01b46f7` 打 tag（建议如需冻结当前主线可执行）

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
