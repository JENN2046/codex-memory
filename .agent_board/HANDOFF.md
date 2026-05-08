# HANDOFF.md — codex-memory

## Current State

所有 Plan 内任务完成（Phase A-J，M-001~M-013，H-002a~c，I-002a~c，J-001~J-003，G-001，8-task batch）。

## Workspace / Branch

- Workspace: A:\codex-memory
- Branch: main
- HEAD: `61b6279`
- Tag: `v0.1.0-maint-20260508`
- Remote: origin/main synced

## Key Baseline

- compare: 43/43 matched, 0/0 core/extended
- rollback: 43/43 rollback-ready, 0/0
- npm test: 131/131
- gate:ci: 119/119 (fixture-only)
- gate:mainline: ok (health 200)
- profile: bge-m3-local__1024__v1, vectors 205, ready
- dashboard: npm run dashboard

## Recent Work

- LightMemo CLI + compare harness support
- gate:ci + dashboard tests
- search_memory scope filter (project_id, visibility, workspace_id, client_id)
- 39→43 baseline sync across 8 docs
- ROADMAP.md archived, checkpoint logs compressed
- SQLite 28-column migration with governance + scope fields

## Next

- P1: Codex/Claude scope acceptance (end-to-end verify scope filter)
- P2: Governance report CLI (proposal/tombstone/supersession/stale metrics)
- `npm run rebuild-shadow` recommended (profile needs-attention, vectors=0)

## Auth Required

- push to origin
- provider benchmark / smoke
- rebuild-profile --confirm
- cleanup apply / confirm
- real SQLite migration (already done in H-002c)
